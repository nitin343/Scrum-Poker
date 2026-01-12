import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
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

import { MemoryRouter } from 'react-router-dom';

// ... imports

describe('GameContext', () => {
    let mockSocket: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSocket = {
            on: vi.fn(),
            emit: vi.fn(),
            disconnect: vi.fn(),
            connect: vi.fn(),
            connected: false
        };
        vi.mocked(io).mockReturnValue(mockSocket);
    });

    it('connects to socket with token on mount', async () => {
        render(
            <MemoryRouter initialEntries={['/room/123']}>
                <GameProvider>
                    <TestComponent />
                </GameProvider>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(io).toHaveBeenCalledWith(expect.stringContaining('localhost'), {
                auth: { token: 'test-token' }
            });
        });
    });

    it('handles connection events', async () => {
        render(
            <MemoryRouter initialEntries={['/room/123']}>
                <GameProvider>
                    <TestComponent />
                </GameProvider>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(io).toHaveBeenCalled();
        });

        // Simulate 'connect' event
        const connectHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === 'connect')?.[1];

        if (connectHandler) {
            act(() => {
                connectHandler();
            });
        }
    });

    it('does not connect if not authenticated', () => {
        vi.mocked(useAuth).mockReturnValue({
            token: null,
            user: null,
            isAuthenticated: false
        } as any);

        render(
            <MemoryRouter initialEntries={['/room/123']}>
                <GameProvider>
                    <TestComponent />
                </GameProvider>
            </MemoryRouter>
        );

        expect(io).not.toHaveBeenCalled();
    });
});
