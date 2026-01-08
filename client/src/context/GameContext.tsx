
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

// Types
export interface Participant {
    userId: string;
    socketId: string;
    displayName?: string;
    selectedCard?: string | number | null;
    hasVoted: boolean;
    isScrumMaster: boolean;
    isConnected?: boolean; // Added connection status
}

export interface Room {
    roomId: string; // Add roomId to Room interface
    roomName?: string; // Added roomName
    participants: Participant[]; // changed from Map to Array for JSON serialization
    currentRound: number;
    isRevealAllowed: boolean;
    areCardsRevealed: boolean;
}

interface GameContextType {
    socket: Socket | null;
    isConnected: boolean;
    room: Room | null;
    userId: string;
    isScrumMaster: boolean;
    joinRoom: (roomId: string, displayName: string, isScrumMaster: boolean, roomName?: string) => void;
    selectCard: (card: string | number) => void;
    revealCards: () => void;
    resetRound: () => void;
    error: string | null;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Generate a random ID for the session if not present
const getUserId = () => {
    let id = localStorage.getItem('scrum_poker_user_id');
    if (!id) {
        id = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('scrum_poker_user_id', id);
    }
    return id;
};

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [room, setRoom] = useState<Room | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isScrumMaster, setIsScrumMaster] = useState(false);

    const userId = getUserId();

    useEffect(() => {
        // Connect to backend (use environment variable or default to localhost)
        const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
        const s = io(serverUrl);
        setSocket(s);

        s.on('connect', () => {
            // console.log('Connected to server');
            setIsConnected(true);
            setError(null);
        });

        s.on('disconnect', () => {
            // console.log('Disconnected');
            setIsConnected(false);
        });

        s.on('room_update', (updatedRoom: Room) => {
            // console.log('Room Update:', updatedRoom);
            setRoom(updatedRoom);
        });

        s.on('vote_update', ({ userId: voterId, hasVoted }: { userId: string, hasVoted: boolean }) => {
            setRoom(prev => {
                if (!prev) return null;
                const newParticipants = prev.participants.map(p =>
                    p.userId === voterId ? { ...p, hasVoted } : p
                );
                return { ...prev, participants: newParticipants };
            });
        });

        s.on('cards_revealed', ({ participants }: { participants: Participant[] }) => {
            setRoom(prev => prev ? { ...prev, participants, areCardsRevealed: true } : null);
        });

        s.on('round_reset', ({ currentRound, participants }: { currentRound: number, participants: Participant[] }) => {
            setRoom(prev => prev ? { ...prev, currentRound, participants, areCardsRevealed: false } : null);
        });

        s.on('error', (err: { message: string }) => {
            setError(err.message);
        });

        return () => {
            s.disconnect();
        };

    }, []);

    const joinRoom = (roomId: string, displayName: string, master: boolean, roomName?: string) => {
        if (!socket) return;
        setIsScrumMaster(master);
        socket.emit('join_room', { roomId, userId, displayName, isScrumMaster: master, roomName });
    };

    const selectCard = (card: string | number) => {
        if (!socket || !room) return;
        socket.emit('select_card', { roomId: room.roomId, userId, card });
        // Optimistic update
        setRoom(prev => {
            if (!prev) return null;
            const newParticipants = prev.participants.map(p =>
                p.userId === userId ? { ...p, hasVoted: true, selectedCard: card } : p
            );
            return { ...prev, participants: newParticipants };
        });
    };

    const revealCards = () => {
        if (!socket || !room) return;
        socket.emit('reveal_cards', { roomId: room.roomId });
    };

    const resetRound = () => {
        if (!socket || !room) return;
        socket.emit('reset_round', { roomId: room.roomId });
    };

    return (
        <GameContext.Provider value={{
            socket, isConnected, room, userId, isScrumMaster,
            joinRoom, selectCard, revealCards, resetRound, error
        }}>
            {children}
        </GameContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useGame = () => {
    const context = useContext(GameContext);
    if (context === undefined) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
};
