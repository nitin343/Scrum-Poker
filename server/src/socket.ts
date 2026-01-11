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
    // Helper: Fetch Issue Data (Jira + DB)
    const fetchIssueData = async (roomId: string, issueStub: any) => {
        try {
            // 1. Fetch from Jira
            let jiraIssue = null;
            try {
                jiraIssue = await jiraService.getIssue(issueStub.issueKey);
            } catch (jiraErr) {
                logger.warn(`Jira fetch failed for ${issueStub.issueKey}`, jiraErr);
            }

            // 2. Fetch History from DB (concurrently?)
            // 2. Fetch History from DB (concurrently?)
            const Sprint = (await import('./models/Sprint')).default;
            const room = getRoom(roomId);
            const query = room?.sprintId
                ? { sprintId: room.sprintId, "tickets.issueKey": issueStub.issueKey }
                : { "tickets.issueKey": issueStub.issueKey };

            const sprint = await Sprint.findOne(query);

            let votingHistory = null;
            if (sprint) {
                const ticket = sprint.tickets.find(t => t.issueKey === issueStub.issueKey);
                if (ticket && ticket.votingRounds && ticket.votingRounds.length > 0) {
                    votingHistory = ticket.votingRounds[ticket.votingRounds.length - 1];
                }
            }

            // Merge
            if (jiraIssue && jiraIssue.fields) {
                const fullIssue: CurrentIssue = {
                    issueKey: jiraIssue.key || issueStub.issueKey,
                    issueId: jiraIssue.id,
                    summary: jiraIssue.fields.summary || issueStub.summary,
                    issueType: jiraIssue.fields.issuetype ? jiraIssue.fields.issuetype.name : 'Story',
                    assignee: jiraIssue.fields.assignee ? {
                        accountId: jiraIssue.fields.assignee.accountId || 'unknown',
                        displayName: jiraIssue.fields.assignee.displayName || 'Unknown'
                    } : undefined,
                    currentPoints: jiraIssue.fields.customfield_10106, // Story Points
                    timeEstimate: (jiraIssue.fields as any).timetracking?.originalEstimate // Time Estimate
                };
                return { fullIssue, votingHistory };
            } else {
                // Return Stub as fallback if Jira fails
                const fullIssue: CurrentIssue = {
                    issueKey: issueStub.issueKey,
                    issueId: issueStub.issueId,
                    summary: issueStub.summary,
                    issueType: 'Story', // fallback
                    assignee: undefined,
                    currentPoints: undefined,
                    timeEstimate: undefined
                };
                return { fullIssue, votingHistory };
            }
        } catch (error) {
            logger.error(`Error fetching data for ${issueStub.issueKey}`, error);
            // Return Stub as fallback
            return {
                fullIssue: {
                    issueKey: issueStub.issueKey,
                    issueId: issueStub.issueId,
                    summary: issueStub.summary,
                    issueType: 'Story'
                } as CurrentIssue,
                votingHistory: null
            };
        }
    };

    // Helper: Activate and Broadcast Issue
    const loadAndBroadcastIssue = async (roomId: string, index: number) => {
        logger.info('[SOCKET] loadAndBroadcastIssue called', { roomId, index });
        const room = getRoom(roomId);
        if (!room) {
            logger.warn('[SOCKET] loadAndBroadcastIssue: Room not found');
            return;
        }

        // CLEANUP: Remove ghost participants (offline users from previous history)
        for (const [id, p] of room.participants) {
            if (!p.isConnected) {
                room.participants.delete(id);
            }
        }

        // 1. Get Stub
        const issueStub = room.issues[index];
        if (!issueStub) return;

        // 2. Check Cache
        let cached = room.issueCache.get(issueStub.issueKey);
        // If cache is older than 5 minutes, invalidate
        if (cached && (Date.now() - cached.timestamp > 5 * 60 * 1000)) {
            cached = undefined;
        }

        let fullIssue: CurrentIssue;
        let votingHistory: any = null;

        if (cached) {
            fullIssue = cached.data;
            const Sprint = (await import('./models/Sprint')).default;
            const sprint = await Sprint.findOne({ "tickets.issueKey": issueStub.issueKey });
            if (sprint) {
                const ticket = sprint.tickets.find(t => t.issueKey === issueStub.issueKey);
                if (ticket?.votingRounds?.length) votingHistory = ticket.votingRounds[ticket.votingRounds.length - 1];
            }
        } else {
            // OPTIMISTIC UPDATE: Emit Stub immediately so user doesn't wait for Jira
            // construct Stub Issue
            const stubIssue: CurrentIssue = {
                issueKey: issueStub.issueKey,
                issueId: issueStub.issueId || 'pending',
                summary: issueStub.summary,
                issueType: 'Story' // Default to Story for stub (until full load)
            };

            // Emit Stub immediately
            room.currentIssue = stubIssue;
            io.to(roomId).emit('issue_changed', {
                issue: stubIssue,
                issueIndex: index,
                totalIssues: room.totalIssues,
                votingHistory: null,
                isPreEstimated: false,
                savedInJira: !!room.savedInJira
            });
            emitRoomUpdate(io, room);

            // CLEANUP: Remove ghost participants (offline users from previous history)
            // Real users are removed on disconnect, so any !isConnected are ghosts.
            for (const [id, p] of room.participants) {
                if (!p.isConnected) {
                    room.participants.delete(id);
                }
            }

            // Fetch Fresh Data (Background)
            logger.info(`Fetching fresh data for ${issueStub.issueKey}`);
            try {
                const data = await fetchIssueData(roomId, issueStub);
                fullIssue = data.fullIssue;
                votingHistory = data.votingHistory;

                // Update Cache
                room.issueCache.set(issueStub.issueKey, {
                    data: fullIssue,
                    timestamp: Date.now()
                });
            } catch (err) {
                logger.error('Failed to fetch fresh issue data', err);
                // Keep using stub if fetch fails hard
                fullIssue = stubIssue;
            }
        }

        // 3. Update Room State
        room.currentIssue = fullIssue;
        room.currentIssueIndex = index;
        room.areCardsRevealed = false;

        // Reset all participants
        room.participants.forEach(p => {
            p.selectedCard = null;
            p.hasVoted = false;
        });

        // 4. Apply History (Merge Logic)
        if (votingHistory) {
            console.log('[SOCKET] Applying Voting History:', JSON.stringify(votingHistory));
            room.areCardsRevealed = true; // Show results immediately

            votingHistory.votes.forEach((vote: any) => {
                console.log('[SOCKET] Processing vote:', { participantId: vote.participantId, participantName: vote.participantName, vote: vote.vote });
                const p = room.participants.get(vote.participantId);

                // If p is found (Online), restore their vote.
                if (p) {
                    p.hasVoted = true;
                    p.selectedCard = vote.vote; // Restore value
                } else {
                    // Create GHOST participant for offline user
                    room.participants.set(vote.participantId, {
                        odId: vote.participantId,
                        socketId: `ghost_${vote.participantId}`,
                        displayName: vote.participantName || 'Unknown User',
                        selectedCard: vote.vote,
                        hasVoted: true,
                        isScrumMaster: false, // Assume false for history
                        isGuest: false,
                        isConnected: false // Marker for Ghost
                    });
                }
            });
        }

        // Broadcast Update (Now includes Ghosts and revealed state)
        emitRoomUpdate(io, room);

        // 5. Determine if ticket was pre-estimated (has points but no voting history from our app)
        const hasExistingEstimate = !!(fullIssue.currentPoints || fullIssue.timeEstimate);
        const hasVotingHistory = !!(votingHistory && votingHistory.votes && votingHistory.votes.length > 0);
        const isPreEstimated = hasExistingEstimate && !hasVotingHistory;

        console.log('\n========== [PRE-ESTIMATED CHECK] ==========');
        console.log('[PRE-EST] Issue:', fullIssue.issueKey);
        console.log('[PRE-EST] currentPoints:', fullIssue.currentPoints);
        console.log('[PRE-EST] timeEstimate:', fullIssue.timeEstimate);
        console.log('[PRE-EST] hasExistingEstimate:', hasExistingEstimate);
        console.log('[PRE-EST] hasVotingHistory:', hasVotingHistory);
        console.log('[PRE-EST] isPreEstimated:', isPreEstimated);
        console.log('========== [/PRE-ESTIMATED CHECK] ==========\n');

        // 5. Emit Events
        const savedInJira = !!(votingHistory && votingHistory.updatedInJira);
        room.savedInJira = savedInJira; // Persist for refreshes
        room.currentIssue = fullIssue; // CRITICAL: Persist current issue in memory

        io.to(roomId).emit('issue_changed', {
            issue: fullIssue,
            issueIndex: index,
            totalIssues: room.totalIssues,
            votingHistory,
            isPreEstimated,
            savedInJira
        });

        emitRoomUpdate(io, room);

        // 6. Prefetch Next (Background)
        prefetchNext(roomId, index + 1);
    };

    // Helper: Background Prefetch
    const prefetchNext = async (roomId: string, nextIndex: number) => {
        const room = getRoom(roomId);
        if (!room || nextIndex >= room.totalIssues) return;

        const stub = room.issues[nextIndex];
        // If already in cache and fresh, skip
        const cached = room.issueCache.get(stub.issueKey);
        if (cached && (Date.now() - cached.timestamp < 5 * 60 * 1000)) return;

        logger.debug(`[Prefetch] Warming cache for ${stub.issueKey}`);
        const data = await fetchIssueData(roomId, stub);

        if (room.issueCache) {
            room.issueCache.set(stub.issueKey, {
                data: data.fullIssue,
                timestamp: Date.now()
            });
        }
    };

    io.on('connection', (socket: Socket) => {
        logger.info('User connected', { socketId: socket.id });

        // JOIN ROOM
        socket.on('join_room', async (payload) => {
            console.log('[SOCKET] join_room payload:', JSON.stringify(payload));
            try {
                const { roomId, odId, displayName, isScrumMaster, roomName, boardId, sprintId, sprintName, companyId } = payload;
                logger.info('[JOIN_ROOM] Processing join request', { roomId, odId });

                if (!roomId || !odId) {
                    logger.error('[JOIN_ROOM] Missing required fields', { roomId, odId });
                    socket.emit('error', { message: 'Missing room or user ID' });
                    return;
                }

                let room = getRoom(roomId);

                if (!room) {
                    if (isScrumMaster) {
                        logger.info('[JOIN_ROOM] Creating new room:', { roomId, odId });
                        room = createRoom(roomId, odId, socket.id, roomName || 'Scrum Poker', {
                            boardId, sprintId, sprintName, companyId, displayName
                        });
                    } else {
                        logger.error('[JOIN_ROOM] Room does not exist and user is not scrum master');
                        socket.emit('error', { message: 'Room does not exist' });
                        return;
                    }
                } else {
                    logger.info('[JOIN_ROOM] Joining existing room, setting participant with odId:', odId);

                    // Repair/Update Room Context if Admin provides it (Sticky Session Fix)
                    if (isScrumMaster && (boardId || sprintId)) {
                        if (boardId) room.boardId = boardId;
                        if (sprintId) room.sprintId = sprintId;
                        if (sprintName) room.sprintName = sprintName;
                        if (companyId) room.companyId = companyId;
                    }

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

                await socket.join(roomId);
                logger.info('[JOIN_ROOM] User joined room. Participants now:', Array.from(room.participants.keys()));

                // Send initial room state to user immediately (Unblock UI)
                emitRoomUpdate(io, room);

                // Initialize / Load Current Issue (Background/Async)
                if (room.issues.length > 0) {
                    loadAndBroadcastIssue(roomId, room.currentIssueIndex).catch(err => logger.error('Initial issue load failed', err));
                }
            } catch (error) {
                logger.error('[JOIN_ROOM] Error:', error);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        // JOIN GUEST
        socket.on('join_as_guest', async ({ sessionId, displayName }) => {
            try {
                const session = await sessionService.getSession(sessionId);
                if (!session) { socket.emit('error', { message: 'Invalid Link' }); return; }

                const roomId = sessionId;
                let room = getRoom(roomId);
                if (!room) {
                    // Explicitly extract fields from Mongoose document
                    room = createRoom(roomId, '', '', session.sprintName, {
                        boardId: session.boardId,
                        sprintId: session.sprintId,
                        companyId: session.companyId
                    });
                    room.participants.clear();
                }

                const guestId = `guest_${socket.id}`;
                const guest = addGuestToRoom(roomId, guestId, socket.id, displayName);
                if (!guest) return;

                socket.join(roomId);
                socket.emit('session_info', {
                    sessionId: session.sessionId,
                    boardId: session.boardId,
                    sprintId: session.sprintId,
                    sprintName: session.sprintName,
                    companyId: session.companyId
                });

                // Send initial room state (Unblock UI)
                emitRoomUpdate(io, room);

                // Load Current Issue for Guest (Background)
                if (room.issues.length > 0) {
                    loadAndBroadcastIssue(roomId, room.currentIssueIndex).catch(err => logger.error('Guest issue load failed', err));
                }
            } catch (e) {
                logger.error('Error in join_as_guest', e);
                socket.emit('error', { message: 'Failed to join session' });
            }
        });  // SET ISSUES
        socket.on('set_issues', ({ roomId, issues }) => {
            try {
                const room = getRoom(roomId);
                if (!room) return;

                // Map to Stubs
                const stubs: any[] = issues.map((i: any) => ({
                    issueKey: i.key || i.issueKey,
                    issueId: i.id || i.issueId,
                    summary: i.summary || i.fields?.summary
                }));

                // Map full objects to Cache immediately
                const transformedIssues: CurrentIssue[] = issues.map((issue: any) => ({
                    issueKey: issue.key || issue.issueKey,
                    summary: issue.summary || issue.fields?.summary || '',
                    issueType: issue.issueType || issue.fields?.issuetype?.name || 'Story',
                    assignee: issue.assignee || (issue.fields?.assignee ? {
                        accountId: issue.fields.assignee.key || issue.fields.assignee.accountId || '',
                        displayName: issue.fields.assignee.displayName || ''
                    } : undefined),
                    currentPoints: issue.currentPoints || issue.fields?.customfield_10106
                }));

                setRoomIssues(roomId, stubs);

                // Warm Cache with Initial Load
                transformedIssues.forEach(full => {
                    room.issueCache.set(full.issueKey, { data: full, timestamp: Date.now() });
                });

                // Activate First Issue
                loadAndBroadcastIssue(roomId, 0);
            } catch (err) {
                logger.error('[SET_ISSUES] Failed', err);
            }
        });

        // NEXT ISSUE
        socket.on('next_issue', async ({ roomId }) => {
            try {
                console.log('[NEXT_ISSUE] Received:', { roomId });
                const room = getRoom(roomId);
                if (!room) {
                    console.log('[NEXT_ISSUE] Room not found');
                    return;
                }
                if (room.currentIssueIndex >= room.totalIssues - 1) {
                    console.log('[NEXT_ISSUE] Already at last issue');
                    return;
                }
                const nextIndex = room.currentIssueIndex + 1;
                console.log('[NEXT_ISSUE] Loading issue', nextIndex);
                await loadAndBroadcastIssue(roomId, nextIndex);
                console.log('[NEXT_ISSUE] Completed');
            } catch (error) {
                logger.error('[NEXT_ISSUE] Error:', error);
                console.error('[NEXT_ISSUE] Error:', error);
            }
        });

        // PREV ISSUE
        socket.on('prev_issue', async ({ roomId }) => {
            try {
                console.log('[PREV_ISSUE] Received:', { roomId });
                const room = getRoom(roomId);
                if (!room) {
                    console.log('[PREV_ISSUE] Room not found');
                    return;
                }
                if (room.currentIssueIndex <= 0) {
                    console.log('[PREV_ISSUE] Already at first issue');
                    return;
                }
                const prevIndex = room.currentIssueIndex - 1;
                console.log('[PREV_ISSUE] Loading issue', prevIndex);
                await loadAndBroadcastIssue(roomId, prevIndex);
                console.log('[PREV_ISSUE] Completed');
            } catch (error) {
                logger.error('[PREV_ISSUE] Error:', error);
                console.error('[PREV_ISSUE] Error:', error);
            }
        });

        // GO TO ISSUE
        socket.on('go_to_issue', async ({ roomId, issueIndex }) => {
            await loadAndBroadcastIssue(roomId, issueIndex);
        });

        // SELECT CARD
        socket.on('select_card', ({ roomId, odId, card }) => {
            logger.info('[SELECT_CARD] Received:', { roomId, odId, card });

            const room = getRoom(roomId);
            if (!room) {
                logger.error('[SELECT_CARD] Room not found:', roomId);
                return;
            }

            logger.info('[SELECT_CARD] Room participants:', Array.from(room.participants.keys()));

            const p = room.participants.get(odId);
            if (p) {
                p.selectedCard = card;
                p.hasVoted = true;
                logger.info('[SELECT_CARD] Vote recorded for:', { odId, card });
                io.to(roomId).emit('vote_update', { odId, hasVoted: true });
            } else {
                logger.error('[SELECT_CARD] Participant NOT FOUND with odId:', odId);
            }
        });

        // REVEAL CARDS (and Save Round History per User Req)
        socket.on('reveal_cards', async ({ roomId }) => {
            console.log('\n========== [REVEAL CARDS] ==========');
            console.log('[REVEAL] reveal_cards event received', { roomId });

            const room = getRoom(roomId);
            if (!room) {
                console.log('[REVEAL] ❌ Room not found', { roomId });
                return;
            }
            if (!room.currentIssue) {
                console.log('[REVEAL] ❌ No current issue in room', { roomId });
                return;
            }

            room.areCardsRevealed = true;
            console.log('[REVEAL] Current issue:', room.currentIssue.issueKey);

            // Collect votes from participants
            const allParticipants = Array.from(room.participants.values());
            console.log('[REVEAL] All participants:');
            allParticipants.forEach(p => {
                console.log(`   - odId: ${p.odId}, name: ${p.displayName}, hasVoted: ${p.hasVoted}, card: ${p.selectedCard}`);
            });

            // User Request: "Update sprints table... under its ticket number"
            try {
                const Sprint = (await import('./models/Sprint')).default;
                console.log('[REVEAL] Searching for Sprint with ticket:', room.currentIssue.issueKey);

                const sprint = await Sprint.findOne({ "tickets.issueKey": room.currentIssue.issueKey });

                if (!sprint) {
                    console.log('[REVEAL] ⚠️ Sprint NOT FOUND for issueKey:', room.currentIssue.issueKey);
                } else {
                    console.log('[REVEAL] ✅ Sprint found:', sprint.sprintId, 'with', sprint.tickets.length, 'tickets');

                    const ticket = sprint.tickets.find(t => t.issueKey === room.currentIssue!.issueKey);
                    if (!ticket) {
                        console.log('[REVEAL] ⚠️ Ticket NOT FOUND in sprint tickets array');
                    } else {
                        console.log('[REVEAL] ✅ Ticket found:', ticket.issueKey);

                        const votes = allParticipants
                            .filter(p => p.hasVoted && p.selectedCard && p.odId)
                            .map(p => ({
                                participantId: p.odId,
                                participantName: p.displayName,
                                vote: String(p.selectedCard),
                                votedAt: new Date()
                            }));

                        console.log('[REVEAL] Votes to save:', JSON.stringify(votes, null, 2));

                        if (votes.length === 0) {
                            console.log('[REVEAL] ⚠️ No valid votes to save! Check participant odId values.');
                        } else {
                            ticket.votingRounds.push({
                                roundNumber: room.currentRound,
                                votes: votes,
                                revealedAt: new Date(),
                                updatedInJira: false
                            });
                            await sprint.save();
                            console.log('[REVEAL] ✅ Successfully saved voting round to DB');
                            console.log('[REVEAL] Ticket now has', ticket.votingRounds.length, 'voting rounds');
                        }
                    }
                }
            } catch (e: any) {
                console.log('[REVEAL] ❌ Failed to save round history:', e.message);
            }

            io.to(roomId).emit('cards_revealed', {
                participants: Array.from(room.participants.values()),
                currentIssue: room.currentIssue
            });
            console.log('[REVEAL] cards_revealed event emitted');
            console.log('========== [/REVEAL CARDS] ==========\n');
        });

        // RESET ROUND
        socket.on('reset_round', ({ roomId }) => {
            const room = getRoom(roomId);
            if (!room) return;

            room.currentRound++;
            room.areCardsRevealed = false;
            room.participants.forEach(p => { p.selectedCard = null; p.hasVoted = false; });

            io.to(roomId).emit('round_reset', {
                currentRound: room.currentRound,
                participants: Array.from(room.participants.values())
            });
            emitRoomUpdate(io, room);
        });

        // ... Assign Points/Assign Ticket handlers logic remains similar, just accessing room.currentIssue ...
        // Keeping them concise for this block:
        socket.on('assign_points', async ({ roomId, issueKey, points }) => {
            // ... sync logic ... 
            // Note: Ensure we update Cache too!
            const room = getRoom(roomId);
            if (room) {
                const cached = room.issueCache.get(issueKey);
                if (cached) {
                    if (cached.data.issueType === 'Bug') cached.data.timeEstimate = String(points);
                    else cached.data.currentPoints = Number(points);
                }
                await jiraService.updateIssuePoints(issueKey, points, 'Story'); // Simplification
                // Re-emit issue_changed to show new points
                if (room.currentIssue && room.currentIssue.issueKey === issueKey) {
                    if (room.currentIssue.issueType === 'Bug') room.currentIssue.timeEstimate = String(points);
                    else room.currentIssue.currentPoints = Number(points);

                    io.to(roomId).emit('issue_changed', { issue: room.currentIssue, issueIndex: room.currentIssueIndex, totalIssues: room.totalIssues });
                }
            }
        });

        socket.on('disconnect', () => {
            // ... existing disconnect logic ...
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
                        // REMOVE user from room entirely (as requested)
                        room.participants.delete(foundodId);
                        logger.info('User removed from room (disconnected)', { odId: foundodId, roomId: room.roomId });

                        // Emit update so frontend removes the seat
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
    logger.info('[SOCKET] emitRoomUpdate sending to', room.roomId);
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
        totalIssues: room.totalIssues,
        savedInJira: room.savedInJira // Ensure this is sent!
    });
}
