"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoom = exports.createRoom = exports.rooms = void 0;
// In-memory store
exports.rooms = new Map();
const createRoom = (roomId, scuMasterId, socketId, roomName = 'Scrum Poker') => {
    const room = {
        roomId,
        roomName,
        participants: new Map(),
        currentRound: 1,
        isRevealAllowed: false,
        areCardsRevealed: false
    };
    // Add Scrum Master as participant
    room.participants.set(scuMasterId, {
        userId: scuMasterId,
        socketId: socketId,
        displayName: 'Scrum Master',
        selectedCard: null,
        hasVoted: false,
        isScrumMaster: true,
        isConnected: true
    });
    exports.rooms.set(roomId, room);
    return room;
};
exports.createRoom = createRoom;
const getRoom = (roomId) => {
    return exports.rooms.get(roomId);
};
exports.getRoom = getRoom;
