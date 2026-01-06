
export interface Participant {
  userId: string;
  socketId: string;
  displayName?: string;
  selectedCard?: string | number | null; // null means not voted
  hasVoted: boolean;
  isScrumMaster: boolean;
}

export interface Room {
  roomId: string;
  participants: Map<string, Participant>; // userId -> Participant
  currentRound: number;
  isRevealAllowed: boolean;
  areCardsRevealed: boolean;
}

// In-memory store
export const rooms = new Map<string, Room>();

export const createRoom = (roomId: string, scuMasterId: string, socketId: string): Room => {
  const room: Room = {
    roomId,
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
    isScrumMaster: true
  });

  rooms.set(roomId, room);
  return room;
};

export const getRoom = (roomId: string): Room | undefined => {
  return rooms.get(roomId);
};
