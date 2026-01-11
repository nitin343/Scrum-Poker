import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

// Types
export interface Participant {
    odId: string;
    userId: string; // Keep for backward compatibility if needed, but backend sends odId
    socketId: string;
    displayName?: string;
    selectedCard?: string | number | null;
    hasVoted: boolean;
    isScrumMaster: boolean;
    isConnected?: boolean;
}

export interface Room {
    roomId: string;
    roomName?: string;
    participants: Participant[];
    currentRound: number;
    isRevealAllowed: boolean;
    areCardsRevealed: boolean;
    currentIssue?: {
        issueKey: string;
        summary: string;
        issueType: string;
        currentPoints?: string | number;
        timeEstimate?: string;
        assignee?: {
            displayName: string;
            avatarUrl?: string;
        };
    };
    currentIssueIndex?: number;
    totalIssues?: number;
    isPreEstimated?: boolean; // True if ticket has estimate but no voting history from our app
    savedInJira?: boolean; // True if current round was already saved to Jira
}

interface GameContextType {
    socket: Socket | null;
    isConnected: boolean;
    room: Room | null;
    userId: string;
    isScrumMaster: boolean;
    joinRoom: (roomId: string, displayName: string, isScrumMaster: boolean, roomName?: string, options?: any) => void;
    joinAsGuest: (sessionId: string, displayName: string) => void;
    selectCard: (card: string | number) => void;
    revealCards: () => void;
    resetRound: () => void;
    nextIssue: () => void;
    prevIssue: () => void;
    goToIssue: (index: number) => void;
    isNavigating: boolean;
    setIssues: (issues: any[]) => void;
    assignPoints: (issueKey: string, points: string | number) => void;
    error: string | null;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, token, isAuthenticated } = useAuth();
    const location = useLocation();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [room, setRoom] = useState<Room | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isScrumMaster, setIsScrumMaster] = useState(false);
    const [guestName, setGuestName] = useState<string | null>(null);
    const [guestSessionId, setGuestSessionId] = useState<string | null>(null);
    const [isNavigating, setIsNavigating] = useState(false);

    // Use auth user id or fallback to socket id (handled in backend for guests)
    const userId = user?.id || '';

    useEffect(() => {
        // Optimization: Only connect socket on Game Room or Guest Join pages
        const shouldConnect = location.pathname.startsWith('/room/') || location.pathname.startsWith('/join/');

        if (!shouldConnect) {
            if (socket) {
                console.log('[GameContext] Disconnecting socket (not on game route)');
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        // Socket.IO needs base URL, not API path
        const apiUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001/api/v1';
        const serverUrl = apiUrl.replace('/api/v1', '');
        let s: Socket;

        if (socket?.connected) return; // Already connected

        if (isAuthenticated && token) {
            // Authenticated Connection
            s = io(serverUrl, {
                auth: { token }
            });
        } else if (guestName && guestSessionId) {
            // Guest Connection
            s = io(serverUrl, {
                auth: { isGuest: true, guestName }
            });
        } else {
            return;
        }

        setSocket(s);

        s.on('connect', () => {
            setIsConnected(true);
            setError(null);
        });

        s.on('disconnect', () => {
            setIsConnected(false);
        });

        s.on('room_update', (updatedRoom: Room) => {
            console.log('[GameContext] Received room_update', updatedRoom);
            // Preserve isPreEstimated from previous state since room_update doesn't include it
            setRoom(prev => ({
                ...updatedRoom,
                isPreEstimated: prev?.isPreEstimated
            }));
        });

        s.on('vote_update', ({ odId, hasVoted }: { odId: string, hasVoted: boolean }) => {
            setRoom(prev => {
                if (!prev) return null;
                const newParticipants = prev.participants.map(p =>
                    (p.odId === odId || p.userId === odId) ? { ...p, hasVoted } : p
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

        s.on('issue_changed', (updatedData: Partial<Room>) => {
            // Stop navigating state when issue changes
            setIsNavigating(false);

            setRoom(prev => prev ? {
                ...prev,
                currentIssue: (updatedData as any).issue,
                currentIssueIndex: (updatedData as any).issueIndex,
                totalIssues: (updatedData as any).totalIssues,
                isPreEstimated: (updatedData as any).isPreEstimated,
                savedInJira: (updatedData as any).savedInJira
            } : null);
        });

        s.on('error', (err: { message: string }) => {
            setError(err.message);
            setIsNavigating(false); // Reset on error
        });

        return () => {
            s.disconnect();
        };

    }, [isAuthenticated, token, guestName, guestSessionId, location.pathname]);

    const joinRoom = (roomId: string, displayName: string, master: boolean, roomName?: string, options: any = {}) => {
        console.log('[GameContext] joinRoom called', { roomId, socketId: socket?.id, isConnected: socket?.connected });
        if (!socket) {
            console.warn('[GameContext] joinRoom aborted: No socket');
            return;
        }
        setIsScrumMaster(master);
        // CRITICAL: Backend expects 'odId', not 'userId'
        const effectiveOdId = userId || `user_${socket.id}`; // Fallback if userId is missing
        socket.emit('join_room', {
            roomId,
            odId: effectiveOdId,
            displayName,
            isScrumMaster: master,
            roomName,
            ...options
        });
    };

    const joinAsGuest = (sessionId: string, name: string) => {
        setGuestSessionId(sessionId);
        setGuestName(name);
    };

    // Effect to join as guest once connected
    useEffect(() => {
        if (isConnected && socket && guestName && guestSessionId && !isAuthenticated) {
            socket.emit('join_as_guest', { sessionId: guestSessionId, displayName: guestName });
        }
    }, [isConnected, socket, guestName, guestSessionId, isAuthenticated]);


    const selectCard = (card: string | number) => {
        if (!socket || !room) return;

        // Find my participant ID (robust lookup for guests vs users)
        const me = room.participants.find(p => p.userId === userId || p.socketId === socket.id);
        const targetId = me ? me.odId : (userId || `guest_${socket.id}`);

        socket.emit('select_card', { roomId: room.roomId, odId: targetId, card });

        // Optimistic update
        setRoom(prev => {
            if (!prev) return null;
            const newParticipants = prev.participants.map(p =>
                p.odId === targetId ? { ...p, hasVoted: true, selectedCard: card } : p
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

    const nextIssue = () => {
        if (!socket || !room) return;
        setIsNavigating(true);
        socket.emit('next_issue', { roomId: room.roomId });
        // Fallback: Reset loading state after 10 seconds if no response
        setTimeout(() => setIsNavigating(false), 10000);
    };

    const prevIssue = () => {
        if (!socket || !room) return;
        setIsNavigating(true);
        socket.emit('prev_issue', { roomId: room.roomId });
        // Fallback: Reset loading state after 10 seconds if no response
        setTimeout(() => setIsNavigating(false), 10000);
    };

    const goToIssue = (index: number) => {
        if (!socket || !room) return;
        setIsNavigating(true);
        socket.emit('go_to_issue', { roomId: room.roomId, issueIndex: index });
    };

    const setIssues = (issues: any[]) => {
        console.log('[setIssues] Called with', issues?.length, 'issues', 'socket:', !!socket, 'room:', !!room);
        if (!socket || !room) {
            console.warn('[setIssues] No socket or room, returning early');
            return;
        }
        console.log('[setIssues] Emitting set_issues event', { roomId: room.roomId, count: issues?.length });
        socket.emit('set_issues', { roomId: room.roomId, issues });
    };

    const assignPoints = (issueKey: string, points: string | number) => {
        console.log('[assignPoints] Called with:', { issueKey, points, hasSocket: !!socket, hasRoom: !!room });
        if (!socket || !room) {
            console.warn('[assignPoints] No socket or room, returning early');
            return;
        }
        console.log('[assignPoints] Emitting assign_points event', { roomId: room.roomId, issueKey, points });
        socket.emit('assign_points', { roomId: room.roomId, issueKey, points });
    };

    return (
        <GameContext.Provider value={{
            socket, isConnected, room, userId, isScrumMaster,
            joinRoom, selectCard, revealCards, resetRound, error,
            joinAsGuest,
            nextIssue, prevIssue, goToIssue, isNavigating,
            setIssues, assignPoints
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
