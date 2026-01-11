"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRoom = exports.goToIssue = exports.prevIssue = exports.nextIssue = exports.setActiveIssue = exports.setRoomIssues = exports.addGuestToRoom = exports.getRoom = exports.createRoom = exports.rooms = void 0;
// In-memory store
exports.rooms = new Map();
/**
 * Create a new room for an admin/scrum master
 */
const createRoom = (roomId, scrumMasterId, socketId, roomName = 'Scrum Poker', options) => {
    const room = {
        roomId,
        roomName,
        boardId: options?.boardId,
        sprintId: options?.sprintId,
        sprintName: options?.sprintName,
        companyId: options?.companyId,
        participants: new Map(),
        currentRound: 1,
        isRevealAllowed: false,
        areCardsRevealed: false,
        currentIssueIndex: 0,
        totalIssues: 0,
        issues: [],
        issueCache: new Map()
    };
    // Add Scrum Master as participant
    room.participants.set(scrumMasterId, {
        odId: scrumMasterId,
        socketId: socketId,
        displayName: options?.displayName || 'Scrum Master',
        selectedCard: null,
        hasVoted: false,
        isScrumMaster: true,
        isGuest: false,
        isConnected: true
    });
    exports.rooms.set(roomId, room);
    return room;
};
exports.createRoom = createRoom;
/**
 * Get room by ID
 */
const getRoom = (roomId) => {
    return exports.rooms.get(roomId);
};
exports.getRoom = getRoom;
/**
 * Add guest to room
 */
const addGuestToRoom = (roomId, odId, socketId, displayName) => {
    const room = exports.rooms.get(roomId);
    if (!room)
        return null;
    const participant = {
        odId,
        socketId,
        displayName,
        selectedCard: null,
        hasVoted: false,
        isScrumMaster: false,
        isGuest: true,
        isConnected: true
    };
    room.participants.set(odId, participant);
    return participant;
};
exports.addGuestToRoom = addGuestToRoom;
/**
 * Set issues for a room (Stubs only)
 */
const setRoomIssues = (roomId, issues) => {
    const room = exports.rooms.get(roomId);
    if (!room)
        return false;
    room.issues = issues;
    room.totalIssues = issues.length;
    room.currentIssueIndex = 0;
    // Note: currentIssue is NOT set here immediately. 
    // It needs to be fetched via "activeIssue" or prefetch logic in socket.ts
    return true;
};
exports.setRoomIssues = setRoomIssues;
/**
 * Helper to update the active issue data
 */
const setActiveIssue = (roomId, issue) => {
    const room = exports.rooms.get(roomId);
    if (!room)
        return;
    room.currentIssue = issue;
    // Also cache it
    room.issueCache.set(issue.issueKey, {
        data: issue,
        timestamp: Date.now()
    });
};
exports.setActiveIssue = setActiveIssue;
/**
 * Navigate to next issue - Returns STUB only
 */
const nextIssue = (roomId) => {
    const room = exports.rooms.get(roomId);
    if (!room)
        return null;
    if (room.currentIssueIndex < room.totalIssues - 1) {
        room.currentIssueIndex++;
        // We do NOT set currentIssue here yet. Caller must fetch it.
        // Reset voting for new issue
        room.areCardsRevealed = false;
        room.currentRound = 1;
        room.participants.forEach(p => {
            p.selectedCard = null;
            p.hasVoted = false;
        });
    }
    return {
        issueStub: room.issues[room.currentIssueIndex] || null,
        index: room.currentIssueIndex,
        total: room.totalIssues
    };
};
exports.nextIssue = nextIssue;
/**
 * Navigate to previous issue - Returns STUB only
 */
const prevIssue = (roomId) => {
    const room = exports.rooms.get(roomId);
    if (!room)
        return null;
    if (room.currentIssueIndex > 0) {
        room.currentIssueIndex--;
        // Reset voting for new issue
        room.areCardsRevealed = false;
        room.currentRound = 1;
        room.participants.forEach(p => {
            p.selectedCard = null;
            p.hasVoted = false;
        });
    }
    return {
        issueStub: room.issues[room.currentIssueIndex] || null,
        index: room.currentIssueIndex,
        total: room.totalIssues
    };
};
exports.prevIssue = prevIssue;
/**
 * Go to specific issue index - Returns STUB only
 */
const goToIssue = (roomId, index) => {
    const room = exports.rooms.get(roomId);
    if (!room)
        return null;
    if (index >= 0 && index < room.totalIssues) {
        room.currentIssueIndex = index;
        // Reset voting for new issue
        room.areCardsRevealed = false;
        room.currentRound = 1;
        room.participants.forEach(p => {
            p.selectedCard = null;
            p.hasVoted = false;
        });
    }
    return {
        issueStub: room.issues[room.currentIssueIndex] || null,
        index: room.currentIssueIndex,
        total: room.totalIssues
    };
};
exports.goToIssue = goToIssue;
/**
 * Delete a room
 */
const deleteRoom = (roomId) => {
    return exports.rooms.delete(roomId);
};
exports.deleteRoom = deleteRoom;
