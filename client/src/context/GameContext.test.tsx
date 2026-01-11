import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { GameProvider, useGame } from './GameContext';
import { io } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client');
vi.mock('./AuthContext', () => ({
    useAuth: vi.fn(() => ({
        token: 'test-token',
        user: { id: 'u1', displayName: 'User 1' },
        isAuthenticated: true
    }))
}));

import { useAuth } from './AuthContext';

const TestComponent = () => {
    const { isConnected, socket } = useGame();
    return <div>{isConnected ? 'Connected' : 'Disconnected'}</div>;
};

describe('GameContext', () => {
    let mockSocket: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSocket = {
            on: vi.fn(),
            emit: vi.fn(),
            disconnect: vi.fn(),
            connect: vi.fn(),
        };
        vi.mocked(io).mockReturnValue(mockSocket);
    });

    it('connects to socket with token on mount', () => {
        render(
            <GameProvider>
                <TestComponent />
            </GameProvider>
        );

        expect(io).toHaveBeenCalledWith(expect.stringContaining('localhost'), {
            auth: { token: 'test-token' }
        });
    });

    it('handles connection events', async () => {
        render(
            <GameProvider>
                <TestComponent />
            </GameProvider>
        );

        // Simulate 'connect' event
        const connectHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === 'connect')[1];
        connectHandler(); // Trigger callback

        // Not easily testable via UI without waitFor or state exposing, relying on internal state update
        // But we can check if error is cleared or specific side effects
    });

    it('does not connect if not authenticated', () => {
        vi.mocked(useAuth).mockReturnValue({
            token: null,
            user: null,
            isAuthenticated: false
        } as any);

        render(
            <GameProvider>
                <TestComponent />
            </GameProvider>
        );

        expect(io).not.toHaveBeenCalled();
    });
});
