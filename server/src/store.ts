
export interface Participant {
  odId: string;         // For admins: MongoDB _id. For guests: generated ID
  socketId: string;
  displayName: string;
  selectedCard?: string | number | null; // null means not voted
  hasVoted: boolean;
  isScrumMaster: boolean;
  isGuest: boolean;          // Whether this is a guest (via invite link)
  isConnected: boolean;
}

export interface IssueStub {
  issueKey: string;
  issueId: string;
  summary: string;
}

export interface CurrentIssue {
  issueKey: string;
  issueId?: string; // Added optional issueId for compatibility
  summary: string;
  issueType: string;
  assignee?: {
    accountId: string;
    displayName: string;
  };
  currentPoints?: number;
  timeEstimate?: string;
}

export interface CachedIssue {
  data: CurrentIssue;
  timestamp: number;
}

export interface Room {
  roomId: string;            // For admin: boardId. For session: sessionId
  roomName: string;
  boardId?: string;          // Jira board ID
  sprintId?: string;         // Jira sprint ID
  sprintName?: string;
  companyId?: string;
  participants: Map<string, Participant>; // odId -> Participant
  currentRound: number;
  isRevealAllowed: boolean;
  areCardsRevealed: boolean;

  // Issue tracking
  currentIssue?: CurrentIssue;
  savedInJira?: boolean; // Persisted status of current issue
  currentIssueIndex: number;
  totalIssues: number;
  issues: IssueStub[];       // Lightweight stubs
  issueCache: Map<string, CachedIssue>; // Key -> Full Data
}

// In-memory store
export const rooms = new Map<string, Room>();

/**
 * Create a new room for an admin/scrum master
 */
export const createRoom = (
  roomId: string,
  scrumMasterId: string,
  socketId: string,
  roomName: string = 'Scrum Poker',
  options?: {
    boardId?: string;
    sprintId?: string;
    sprintName?: string;
    companyId?: string;
    displayName?: string;
  }
): Room => {
  const room: Room = {
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

  rooms.set(roomId, room);
  return room;
};

/**
 * Get room by ID
 */
export const getRoom = (roomId: string): Room | undefined => {
  return rooms.get(roomId);
};

/**
 * Add guest to room
 */
export const addGuestToRoom = (
  roomId: string,
  odId: string,
  socketId: string,
  displayName: string
): Participant | null => {
  const room = rooms.get(roomId);
  if (!room) return null;

  const participant: Participant = {
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

/**
 * Set issues for a room (Stubs only)
 */
export const setRoomIssues = (roomId: string, issues: IssueStub[]): boolean => {
  const room = rooms.get(roomId);
  if (!room) return false;

  room.issues = issues;
  room.totalIssues = issues.length;
  room.currentIssueIndex = 0;
  // Note: currentIssue is NOT set here immediately. 
  // It needs to be fetched via "activeIssue" or prefetch logic in socket.ts

  return true;
};

/**
 * Helper to update the active issue data
 */
export const setActiveIssue = (roomId: string, issue: CurrentIssue) => {
  const room = rooms.get(roomId);
  if (!room) return;
  room.currentIssue = issue;

  // Also cache it
  room.issueCache.set(issue.issueKey, {
    data: issue,
    timestamp: Date.now()
  });
};

/**
 * Navigate to next issue - Returns STUB only
 */
export const nextIssue = (roomId: string): { issueStub: IssueStub | null; index: number; total: number } | null => {
  const room = rooms.get(roomId);
  if (!room) return null;

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

/**
 * Navigate to previous issue - Returns STUB only
 */
export const prevIssue = (roomId: string): { issueStub: IssueStub | null; index: number; total: number } | null => {
  const room = rooms.get(roomId);
  if (!room) return null;

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

/**
 * Go to specific issue index - Returns STUB only
 */
export const goToIssue = (roomId: string, index: number): { issueStub: IssueStub | null; index: number; total: number } | null => {
  const room = rooms.get(roomId);
  if (!room) return null;

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

/**
 * Delete a room
 */
export const deleteRoom = (roomId: string): boolean => {
  return rooms.delete(roomId);
};
