export interface Participant {
    userId: string;
    socketId: string;
    displayName?: string;
    selectedCard?: string | number | null;
    hasVoted: boolean;
    isScrumMaster: boolean;
    isConnected: boolean;
}

export interface GameRoom {
    roomId: string;
    roomName: string;
    participants: Map<string, Participant>;
    currentRound: number;
    isRevealAllowed: boolean;
    areCardsRevealed: boolean;
}

export interface VotingResult {
    average: number;
    agreement: number;
    votes: { [key: string]: number };
}

export type CardValue = string | number | '?' | '☕';

export interface AuthUser {
    id: string;
    email: string;
    displayName: string;
    token: string;
}

export interface ApiError {
    type: string;
    message: string;
    statusCode: number;
    timestamp: string;
}
