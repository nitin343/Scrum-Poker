import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GameProvider } from './context/GameContext';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { api } from './services/api';

// Mock API
vi.mock('./services/api', () => ({
    api: {
        auth: {
            login: vi.fn(),
            signup: vi.fn(),
        },
        jira: {
            getBoards: vi.fn(),
            getSprints: vi.fn(),
        },
        sessions: {
            getAll: vi.fn(),
            create: vi.fn(),
        }
    }
}));

const renderApp = () => {
    return render(
        <AuthProvider>
            <GameProvider>
                <MemoryRouter initialEntries={['/auth']}>
                    <Routes>
                        <Route path="/auth" element={<AuthPage />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                    </Routes>
                </MemoryRouter>
            </GameProvider>
        </AuthProvider>
    );
};

describe('Full User Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        // Force Desktop Size
        global.innerWidth = 1280;
        global.dispatchEvent(new Event('resize'));
    });

    it('allows user to login, view dashboard, and create a session', async () => {
        // 1. Setup API mocks
        vi.mocked(api.auth.login).mockResolvedValue({
            token: 'test-token',
            user: { id: '1', displayName: 'Flow User' },
            inviteCode: 'FLOW123'
        });

        vi.mocked(api.sessions.getAll).mockResolvedValue({ success: true, sessions: [] });

        vi.mocked(api.jira.getBoards).mockResolvedValue({
            success: true,
            boards: [{ id: 10, name: 'Flow Board', type: 'scrum' }]
        });

        vi.mocked(api.jira.getSprints).mockResolvedValue({
            success: true,
            sprints: [{ id: 20, name: 'Flow Sprint', state: 'active' }]
        });

        vi.mocked(api.sessions.create).mockResolvedValue({ success: true, sessionId: 'new-session' });

        // 2. Render App (starts at /auth)
        renderApp();

        // 3. Perform Login
        expect(screen.getByText('Welcome Back')).toBeInTheDocument();
        fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'flow@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password' } });
        fireEvent.click(screen.getByText('Sign In'));

        // 4. Verify Dashboard Transition
        // Use findByText to wait for appearance (async) with 5s timeout
        expect(await screen.findByText('Scrum Poker', {}, { timeout: 5000 })).toBeInTheDocument();

        // 5. Open Create Session Modal
        // Sidebar has "New Session"
        const createBtn = screen.getByText('New Session');
        fireEvent.click(createBtn);

        // 6. Modal Interaction
        // Wait for Modal Title "Create New Session"
        expect(await screen.findByText('Create New Session', {}, { timeout: 5000 })).toBeInTheDocument();

        // Wait for boards
        expect(await screen.findByText('Flow Board', {}, { timeout: 5000 })).toBeInTheDocument();
        fireEvent.click(screen.getByText('Flow Board'));

        // Wait for sprints
        expect(await screen.findByText('Flow Sprint', {}, { timeout: 5000 })).toBeInTheDocument();
        fireEvent.click(screen.getByText('Flow Sprint'));

        // Launch
        fireEvent.click(screen.getByText('Launch Session'));

        // 7. Verify Creation
        await waitFor(() => {
            expect(api.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
                boardId: '10',
                sprintId: '20'
            }));
        }, { timeout: 5000 });
    });
});
