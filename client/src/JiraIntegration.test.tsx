import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameRoomPage } from './pages/GameRoomPage';
import { GameProvider } from './context/GameContext';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api } from './services/api';

// Helper to capture socket callbacks
let socketCallbacks: Record<string, Function> = {};

const mockSocket = {
    on: vi.fn((event, cb) => {
        socketCallbacks[event] = cb;
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    id: 'socket-123',
    connected: true
};

vi.mock('socket.io-client', () => ({
    io: vi.fn(() => mockSocket),
    Socket: vi.fn()
}));

// Mocks
vi.mock('./services/api', () => ({
    api: {
        sessions: {
            get: vi.fn()
        },
        jira: {
            getSprintIssues: vi.fn()
        },
        sprints: {
            syncJira: vi.fn()
        },
        auth: {
            getMe: vi.fn()
        }
    }
}));

// Mock AuthContext
vi.mock('./context/AuthContext', () => ({
    useAuth: () => ({
        isAuthenticated: true,
        user: { id: 'u1', display_name: 'Scrum Master' },
        token: 'fake-token'
    }),
    AuthProvider: ({ children }: any) => <>{children}</>
}));

describe('Jira Integration UI', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        socketCallbacks = {}; // Reset callbacks

        // Default Mock Data
        (api.sessions.get as any).mockResolvedValue({
            boardId: 'b1',
            sprintId: 's1',
            boardName: 'Board',
            sprintName: 'Sprint',
            companyId: 'c1'
        });
    });

    it('Sync Jira button triggers API and socket emission', async () => {
        (api.jira.getSprintIssues as any).mockResolvedValue({
            issues: [{ key: 'ISSUE-1', summary: 'Test Issue' }]
        });

        render(
            <GameProvider>
                <MemoryRouter initialEntries={['/room/s1']}>
                    <Routes>
                        <Route path="/room/:roomId" element={<GameRoomPage />} />
                    </Routes>
                </MemoryRouter>
            </GameProvider>
        );

        await waitFor(() => expect(socketCallbacks['connect']).toBeDefined());
        socketCallbacks['connect']();

        await waitFor(() => expect(api.sessions.get).toHaveBeenCalled());

        // Manually trigger room update
        await waitFor(() => expect(socketCallbacks['room_update']).toBeDefined());
        socketCallbacks['room_update']({
            roomId: 's1',
            roomName: 'Sprint',
            participants: [{ userId: 'u1', isScrumMaster: true, isConnected: true }],
            boardId: 'b1',
            sprintId: 's1',
            currentRound: 1,
            areCardsRevealed: false
        });

        await waitFor(() => {
            expect(screen.getByText(/Sync Jira/i)).toBeInTheDocument();
        });

        const syncBtn = screen.getByText(/Sync Jira/i);
        fireEvent.click(syncBtn);

        await waitFor(() => {
            expect(api.jira.getSprintIssues).toHaveBeenCalledWith('b1', 's1');
            expect(api.sprints.syncJira).toHaveBeenCalled();
            expect(mockSocket.emit).toHaveBeenCalledWith('set_issues', expect.objectContaining({
                issues: expect.arrayContaining([expect.objectContaining({ key: 'ISSUE-1' })])
            }));
        });
    });

    it('Snaps average to nearest Fibonacci for Stories', async () => {
        render(
            <GameProvider>
                <MemoryRouter initialEntries={['/room/s1']}>
                    <Routes>
                        <Route path="/room/:roomId" element={<GameRoomPage />} />
                    </Routes>
                </MemoryRouter>
            </GameProvider>
        );

        await waitFor(() => expect(socketCallbacks['connect']).toBeDefined());
        socketCallbacks['connect']();
        await waitFor(() => expect(api.sessions.get).toHaveBeenCalled());

        socketCallbacks['room_update']({
            roomId: 's1',
            participants: [
                { userId: 'u1', isScrumMaster: true, hasVoted: true, selectedCard: 5 },
                { userId: 'u2', isScrumMaster: false, hasVoted: true, selectedCard: 8 },
                { userId: 'u3', isScrumMaster: false, hasVoted: true, selectedCard: 8 }
            ],
            areCardsRevealed: true,
            currentIssue: { issueKey: 'STORY-1', issueType: 'Story', summary: 'Story' }
        });

        // Avg: (5+8+8)/3 = 7. 
        // 7 is between 5 and 8. 8 is closer. 

        await waitFor(() => {
            expect(screen.getByText('Average')).toBeInTheDocument();
            const input = screen.getByRole('spinbutton') as HTMLInputElement; // number input
            expect(input.value).toBe('8');
        });
    });

    it('Shows text input for Bugs', async () => {
        render(
            <GameProvider>
                <MemoryRouter initialEntries={['/room/s1']}>
                    <Routes>
                        <Route path="/room/:roomId" element={<GameRoomPage />} />
                    </Routes>
                </MemoryRouter>
            </GameProvider>
        );

        await waitFor(() => expect(socketCallbacks['connect']).toBeDefined());
        socketCallbacks['connect']();
        await waitFor(() => expect(api.sessions.get).toHaveBeenCalled());

        socketCallbacks['room_update']({
            roomId: 's1',
            participants: [
                { userId: 'u1', isScrumMaster: true, hasVoted: true, selectedCard: '?' }
            ],
            areCardsRevealed: true,
            currentIssue: { issueKey: 'BUG-1', issueType: 'Bug', summary: 'Bug' }
        });

        await waitFor(() => {
            const input = screen.getByRole('textbox') as HTMLInputElement; // text input
            expect(input.placeholder).toContain('e.g. 1d 4h');

            fireEvent.change(input, { target: { value: '2d' } });
            expect(input.value).toBe('2d');

            fireEvent.click(screen.getByText('Save'));

            expect(mockSocket.emit).toHaveBeenCalledWith('assign_points', expect.objectContaining({
                issueKey: 'BUG-1',
                points: '2d'
            }));
        });
    });
});
