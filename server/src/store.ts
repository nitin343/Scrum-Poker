
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

export interface CurrentIssue {
  issueKey: string;
  summary: string;
  issueType: 'Story' | 'Bug' | 'Task' | 'Sub-task';
  assignee?: {
    accountId: string;
    displayName: string;
  };
  currentPoints?: number;
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
  currentIssueIndex: number;
  totalIssues: number;
  issues: CurrentIssue[];    // All issues for the session
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
    issues: []
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
 * Set issues for a room
 */
export const setRoomIssues = (roomId: string, issues: CurrentIssue[]): boolean => {
  const room = rooms.get(roomId);
  if (!room) return false;

  room.issues = issues;
  room.totalIssues = issues.length;
  room.currentIssueIndex = 0;
  room.currentIssue = issues[0] || undefined;

  return true;
};

/**
 * Navigate to next issue
 */
export const nextIssue = (roomId: string): { issue: CurrentIssue | null; index: number; total: number } | null => {
  const room = rooms.get(roomId);
  if (!room) return null;

  if (room.currentIssueIndex < room.totalIssues - 1) {
    room.currentIssueIndex++;
    room.currentIssue = room.issues[room.currentIssueIndex];

    // Reset voting for new issue
    room.areCardsRevealed = false;
    room.currentRound = 1;
    room.participants.forEach(p => {
      p.selectedCard = null;
      p.hasVoted = false;
    });
  }

  return {
    issue: room.currentIssue || null,
    index: room.currentIssueIndex,
    total: room.totalIssues
  };
};

/**
 * Navigate to previous issue
 */
export const prevIssue = (roomId: string): { issue: CurrentIssue | null; index: number; total: number } | null => {
  const room = rooms.get(roomId);
  if (!room) return null;

  if (room.currentIssueIndex > 0) {
    room.currentIssueIndex--;
    room.currentIssue = room.issues[room.currentIssueIndex];

    // Reset voting for new issue
    room.areCardsRevealed = false;
    room.currentRound = 1;
    room.participants.forEach(p => {
      p.selectedCard = null;
      p.hasVoted = false;
    });
  }

  return {
    issue: room.currentIssue || null,
    index: room.currentIssueIndex,
    total: room.totalIssues
  };
};

/**
 * Go to specific issue index
 */
export const goToIssue = (roomId: string, index: number): { issue: CurrentIssue | null; index: number; total: number } | null => {
  const room = rooms.get(roomId);
  if (!room) return null;

  if (index >= 0 && index < room.totalIssues) {
    room.currentIssueIndex = index;
    room.currentIssue = room.issues[index];

    // Reset voting for new issue
    room.areCardsRevealed = false;
    room.currentRound = 1;
    room.participants.forEach(p => {
      p.selectedCard = null;
      p.hasVoted = false;
    });
  }

  return {
    issue: room.currentIssue || null,
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
