
import { Server, Socket } from 'socket.io';
import { rooms, createRoom, getRoom } from './store';

export const setupSocket = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        console.log(`User connected: ${socket.id}`);

        // Join Room
        socket.on('join_room', ({ roomId, userId, displayName, isScrumMaster, roomName }) => {
            let room = getRoom(roomId);

            if (!room) {
                if (isScrumMaster) {
                    // Create new room with provided name
                    room = createRoom(roomId, userId, socket.id, roomName || 'Scrum Poker');
                    console.log(`Room created: ${roomId} by ${userId}`);
                } else {
                    socket.emit('error', { message: 'Room does not exist' });
                    return;
                }
            }

            // Add/Update participant
            room.participants.set(userId, {
                userId,
                socketId: socket.id,
                displayName: displayName || 'Anonymous',
                selectedCard: room.participants.get(userId)?.selectedCard || null, // Preserve card if reconnecting
                hasVoted: room.participants.get(userId)?.hasVoted || false,
                isScrumMaster: !!isScrumMaster,
                isConnected: true
            });

            socket.join(roomId);

            // Emit updated room state to all in room
            io.to(roomId).emit('room_update', {
                roomId: room.roomId,
                roomName: room.roomName,
                participants: Array.from(room.participants.values()),
                currentRound: room.currentRound,
                areCardsRevealed: room.areCardsRevealed
            });
        });

        // Select Card
        socket.on('select_card', ({ roomId, userId, card }) => {
            const room = getRoom(roomId);
            if (!room) return;

            const participant = room.participants.get(userId);
            if (participant) {
                participant.selectedCard = card;
                participant.hasVoted = true;

                // Broadcast vote status (without revealing card value)
                io.to(roomId).emit('vote_update', {
                    userId,
                    hasVoted: true
                });

                // Check if all voted (optional auto-reveal logic could go here, but SOP says manual)
            }
        });

        // Reveal Cards
        socket.on('reveal_cards', ({ roomId }) => {
            const room = getRoom(roomId);
            if (!room) return;

            // TODO: Verify sender is Scrum Master (simple check via socketId/userId mapping if needed, or trust client for prototype)

            room.areCardsRevealed = true;
            io.to(roomId).emit('cards_revealed', {
                participants: Array.from(room.participants.values())
            });
        });

        // Reset Round
        socket.on('reset_round', ({ roomId }) => {
            const room = getRoom(roomId);
            if (!room) return;

            room.currentRound += 1;
            room.areCardsRevealed = false;
            room.participants.forEach(p => {
                p.selectedCard = null;
                p.hasVoted = false;
            });

            io.to(roomId).emit('round_reset', {
                currentRound: room.currentRound,
                participants: Array.from(room.participants.values())
            });
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);

            // Find room and participant by socketId to mark as disconnected
            rooms.forEach((room) => {
                let foundUserId: string | null = null;
                for (const [uid, p] of room.participants.entries()) {
                    if (p.socketId === socket.id) {
                        foundUserId = uid;
                        break;
                    }
                }

                if (foundUserId) {
                    const p = room.participants.get(foundUserId);
                    if (p) {
                        p.isConnected = false;
                        console.log(`Marking user ${foundUserId} as offline`);

                        io.to(room.roomId).emit('room_update', {
                            roomId: room.roomId,
                            roomName: room.roomName,
                            participants: Array.from(room.participants.values()),
                            currentRound: room.currentRound,
                            areCardsRevealed: room.areCardsRevealed
                        });
                    }
                }
            });
        });
    });
};
