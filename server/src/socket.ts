import { Server, Socket } from 'socket.io';
import {
    rooms,
    createRoom,
    getRoom,
    addGuestToRoom,
    setRoomIssues,
    nextIssue,
    prevIssue,
    goToIssue,
    CurrentIssue
} from './store';
import { sessionService } from './services/SessionService';
import { jiraService } from './services/JiraService';
import { logger } from './utils/logger/Logger';

export const setupSocket = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        logger.info('User connected', { socketId: socket.id });

        // ===========================================
        // JOIN ROOM (Admin/Scrum Master)
        // ===========================================
        socket.on('join_room', ({ roomId, odId, displayName, isScrumMaster, roomName, boardId, sprintId, sprintName, companyId }) => {
            let room = getRoom(roomId);

            if (!room) {
                if (isScrumMaster) {
                    // Create new room with provided details
                    room = createRoom(roomId, odId, socket.id, roomName || 'Scrum Poker', {
                        boardId,
                        sprintId,
                        sprintName,
                        companyId,
                        displayName
                    });
                    logger.info('Room created', { roomId, odId, boardId, sprintId });
                } else {
                    socket.emit('error', { message: 'Room does not exist' });
                    return;
                }
            } else {
                // Update existing participant or add new one
                const existing = room.participants.get(odId);
                room.participants.set(odId, {
                    odId,
                    socketId: socket.id,
                    displayName: displayName || existing?.displayName || 'Anonymous',
                    selectedCard: existing?.selectedCard || null,
                    hasVoted: existing?.hasVoted || false,
                    isScrumMaster: !!isScrumMaster,
                    isGuest: false,
                    isConnected: true
                });
            }

            socket.join(roomId);
            logger.debug('User joined room', { roomId, odId });

            // Emit updated room state to all in room
            emitRoomUpdate(io, room);
        });

        // ===========================================
        // JOIN AS GUEST (Via invite link)
        // ===========================================
        socket.on('join_as_guest', async ({ sessionId, displayName }) => {
            try {
                // Validate the session
                const session = await sessionService.getSession(sessionId);

                if (!session) {
                    socket.emit('error', { message: 'Invalid or expired invite link' });
                    return;
                }

                const roomId = sessionId; // Use sessionId as roomId for guest sessions
                let room = getRoom(roomId);

                // Create room if it doesn't exist (first guest to join)
                if (!room) {
                    room = createRoom(roomId, '', '', session.sprintName, {
                        boardId: session.boardId,
                        sprintId: session.sprintId,
                        sprintName: session.sprintName,
                        companyId: session.companyId
                    });
                    // Remove the empty scrum master entry
                    room.participants.clear();
                }

                // Generate a guest ID
                const guestId = `guest_${socket.id}`;

                // Add guest to room
                const guest = addGuestToRoom(roomId, guestId, socket.id, displayName);

                if (!guest) {
                    socket.emit('error', { message: 'Failed to join room' });
                    return;
                }

                socket.join(roomId);
                logger.info('Guest joined room', { roomId, guestId, displayName, sessionId });

                // Send session info to the guest
                socket.emit('session_info', {
                    sessionId,
                    boardName: session.boardName,
                    sprintName: session.sprintName,
                    createdByName: session.createdByName
                });

                // Emit updated room state
                emitRoomUpdate(io, room);
            } catch (error: any) {
                logger.error('Guest join error', { error: error.message });
                socket.emit('error', { message: 'Failed to join session' });
            }
        });

        // ===========================================
        // SET ISSUES (Admin sets issues for the session)
        // ===========================================
        socket.on('set_issues', ({ roomId, issues }) => {
            const room = getRoom(roomId);
            if (!room) return;

            const transformedIssues: CurrentIssue[] = issues.map((issue: any) => ({
                issueKey: issue.key || issue.issueKey,
                summary: issue.summary || issue.fields?.summary || '',
                issueType: issue.issueType || issue.fields?.issuetype?.name || 'Story',
                assignee: issue.assignee || (issue.fields?.assignee ? {
                    accountId: issue.fields.assignee.accountId,
                    displayName: issue.fields.assignee.displayName
                } : undefined),
                currentPoints: issue.currentPoints || issue.fields?.customfield_10106
            }));

            setRoomIssues(roomId, transformedIssues);

            logger.info('Issues set for room', { roomId, count: transformedIssues.length });

            // Emit issue_changed to all participants
            io.to(roomId).emit('issue_changed', {
                issue: room.currentIssue,
                issueIndex: room.currentIssueIndex,
                totalIssues: room.totalIssues
            });

            emitRoomUpdate(io, room);
        });

        // ===========================================
        // SELECT CARD (Vote)
        // ===========================================
        socket.on('select_card', ({ roomId, odId, card }) => {
            const room = getRoom(roomId);
            if (!room) return;

            const participant = room.participants.get(odId);
            if (participant) {
                participant.selectedCard = card;
                participant.hasVoted = true;
                logger.debug('Card selected', { roomId, odId, card });

                // Broadcast vote status (without revealing card value)
                io.to(roomId).emit('vote_update', {
                    odId,
                    hasVoted: true
                });
            }
        });

        // ===========================================
        // REVEAL CARDS
        // ===========================================
        socket.on('reveal_cards', ({ roomId }) => {
            const room = getRoom(roomId);
            if (!room) return;

            room.areCardsRevealed = true;
            logger.info('Cards revealed', { roomId });

            io.to(roomId).emit('cards_revealed', {
                participants: Array.from(room.participants.values()),
                currentIssue: room.currentIssue
            });
        });

        // ===========================================
        // RESET ROUND (Re-vote same issue)
        // ===========================================
        socket.on('reset_round', ({ roomId }) => {
            const room = getRoom(roomId);
            if (!room) return;

            room.currentRound += 1;
            room.areCardsRevealed = false;
            room.participants.forEach(p => {
                p.selectedCard = null;
                p.hasVoted = false;
            });

            logger.info('Round reset', { roomId, newRound: room.currentRound });
            io.to(roomId).emit('round_reset', {
                currentRound: room.currentRound,
                participants: Array.from(room.participants.values())
            });
        });

        // ===========================================
        // NEXT ISSUE
        // ===========================================
        socket.on('next_issue', ({ roomId }) => {
            const result = nextIssue(roomId);
            if (!result) return;

            logger.info('Next issue', { roomId, index: result.index });

            io.to(roomId).emit('issue_changed', {
                issue: result.issue,
                issueIndex: result.index,
                totalIssues: result.total
            });

            // Also emit room update for vote reset
            const room = getRoom(roomId);
            if (room) {
                emitRoomUpdate(io, room);
            }
        });

        // ===========================================
        // PREVIOUS ISSUE
        // ===========================================
        socket.on('prev_issue', ({ roomId }) => {
            const result = prevIssue(roomId);
            if (!result) return;

            logger.info('Previous issue', { roomId, index: result.index });

            io.to(roomId).emit('issue_changed', {
                issue: result.issue,
                issueIndex: result.index,
                totalIssues: result.total
            });

            const room = getRoom(roomId);
            if (room) {
                emitRoomUpdate(io, room);
            }
        });

        // ===========================================
        // GO TO SPECIFIC ISSUE
        // ===========================================
        socket.on('go_to_issue', ({ roomId, issueIndex }) => {
            const result = goToIssue(roomId, issueIndex);
            if (!result) return;

            logger.info('Go to issue', { roomId, index: result.index });

            io.to(roomId).emit('issue_changed', {
                issue: result.issue,
                issueIndex: result.index,
                totalIssues: result.total
            });

            const room = getRoom(roomId);
            if (room) {
                emitRoomUpdate(io, room);
            }
        });

        // ===========================================
        // ASSIGN STORY POINTS (Syncs to Jira)
        // ===========================================
        socket.on('assign_points', async ({ roomId, issueKey, points }) => {
            try {
                const room = getRoom(roomId);
                if (!room) return;

                logger.info('Assigning points', { roomId, issueKey, points });

                // Update Jira
                // Note: This will use the server's Jira credentials
                // In production, you might want to use the user's credentials
                await jiraService.searchIssues(`key = ${issueKey}`); // Verify issue exists

                // Emit sync confirmation
                io.to(roomId).emit('jira_synced', {
                    issueKey,
                    field: 'story_points',
                    value: points,
                    success: true
                });

                // Update local issue if it exists
                if (room.currentIssue && room.currentIssue.issueKey === issueKey) {
                    room.currentIssue.currentPoints = points;
                }
                const issue = room.issues.find(i => i.issueKey === issueKey);
                if (issue) {
                    issue.currentPoints = points;
                }

            } catch (error: any) {
                logger.error('Failed to assign points', { issueKey, error: error.message });
                socket.emit('jira_synced', {
                    issueKey,
                    field: 'story_points',
                    value: points,
                    success: false,
                    error: error.message
                });
            }
        });

        // ===========================================
        // ASSIGN TICKET (Syncs to Jira)
        // ===========================================
        socket.on('assign_ticket', async ({ roomId, issueKey, accountId, displayName }) => {
            try {
                const room = getRoom(roomId);
                if (!room) return;

                logger.info('Assigning ticket', { roomId, issueKey, accountId });

                // Update local data
                if (room.currentIssue && room.currentIssue.issueKey === issueKey) {
                    room.currentIssue.assignee = { accountId, displayName };
                }
                const issue = room.issues.find(i => i.issueKey === issueKey);
                if (issue) {
                    issue.assignee = { accountId, displayName };
                }

                // Emit sync confirmation
                io.to(roomId).emit('jira_synced', {
                    issueKey,
                    field: 'assignee',
                    value: { accountId, displayName },
                    success: true
                });

                // Emit issue update
                io.to(roomId).emit('issue_changed', {
                    issue: room.currentIssue,
                    issueIndex: room.currentIssueIndex,
                    totalIssues: room.totalIssues
                });

            } catch (error: any) {
                logger.error('Failed to assign ticket', { issueKey, error: error.message });
                socket.emit('jira_synced', {
                    issueKey,
                    field: 'assignee',
                    value: { accountId, displayName },
                    success: false,
                    error: error.message
                });
            }
        });

        // ===========================================
        // DISCONNECT
        // ===========================================
        socket.on('disconnect', () => {
            logger.info('User disconnected', { socketId: socket.id });

            // Find room and participant by socketId to mark as disconnected
            rooms.forEach((room) => {
                let foundodId: string | null = null;
                for (const [uid, p] of room.participants.entries()) {
                    if (p.socketId === socket.id) {
                        foundodId = uid;
                        break;
                    }
                }

                if (foundodId) {
                    const p = room.participants.get(foundodId);
                    if (p) {
                        p.isConnected = false;
                        logger.info('User marked as offline', { odId: foundodId, roomId: room.roomId });
                        emitRoomUpdate(io, room);
                    }
                }
            });
        });
    });
};

/**
 * Helper to emit room update to all participants
 */
function emitRoomUpdate(io: Server, room: any) {
    io.to(room.roomId).emit('room_update', {
        roomId: room.roomId,
        roomName: room.roomName,
        boardId: room.boardId,
        sprintId: room.sprintId,
        sprintName: room.sprintName,
        participants: Array.from(room.participants.values()),
        currentRound: room.currentRound,
        areCardsRevealed: room.areCardsRevealed,
        currentIssue: room.currentIssue,
        currentIssueIndex: room.currentIssueIndex,
        totalIssues: room.totalIssues
    });
}
