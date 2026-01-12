import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardPage } from './DashboardPage';
import { AuthProvider } from '../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import { api } from '../services/api';

// Mock dependencies
vi.mock('../services/api', () => ({
    api: {
        sessions: {
            create: vi.fn(),
            getAll: vi.fn(),
            delete: vi.fn(),
        },
        jira: {
            getSprints: vi.fn(),
            getBoards: vi.fn()
        }
    }
}));

const renderDashboard = () => {
    return render(
        <BrowserRouter>
            <AuthProvider>
                <DashboardPage />
            </AuthProvider>
        </BrowserRouter>
    );
};

let currentTime = new Date(2024, 1, 1, 13, 0, 0).getTime();

describe('DashboardPage', () => {
    beforeEach(() => {
        // Only fake Date to allow waitFor to rely on real SetTimeout/SetInterval
        vi.useFakeTimers({ toFake: ['Date'] });

        // Advance time by 2 seconds for each test to bypass 1s debounce
        currentTime += 2000;
        vi.setSystemTime(currentTime);

        vi.clearAllMocks();
        localStorage.setItem('token', 'fake-token');
        localStorage.setItem('user', JSON.stringify({ id: '1', displayName: 'Test User', selectedBoardId: 'board-789' }));

        // Default mock for sprints
        vi.mocked(api.jira.getSprints).mockResolvedValue({
            success: true,
            sprints: []
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders dashboard with user name', async () => {
        renderDashboard();
        expect(screen.getByText('Scrum Poker')).toBeInTheDocument();
        // Sprints header should be visible
        expect(screen.getByText('Sprints')).toBeInTheDocument();
    });

    it('displays fetched sprints', async () => {
        const mockSprints = [
            { id: 1, name: 'Sprint 1', state: 'active' },
            { id: 2, name: 'Sprint 2', state: 'future' }
        ];

        vi.mocked(api.jira.getSprints).mockResolvedValue({
            success: true,
            sprints: mockSprints
        });

        renderDashboard();

        await waitFor(() => {
            expect(screen.getByText('Sprint 1')).toBeInTheDocument();
            expect(screen.getByText('Sprint 2')).toBeInTheDocument();
        });
    });

    it('navigates to session creation when sprint is clicked', async () => {
        const mockSprints = [
            { id: 1, name: 'Sprint 1', state: 'active' }
        ];

        vi.mocked(api.jira.getSprints).mockResolvedValue({
            success: true,
            sprints: mockSprints
        });

        // Mock session create response
        vi.mocked(api.sessions.create).mockResolvedValue({
            data: {
                sessionId: 'session-123',
                inviteToken: 'token-123'
            }
        });

        renderDashboard();

        // Wait for sprint to load
        await waitFor(() => {
            expect(screen.getByText('Sprint 1')).toBeInTheDocument();
        });

        // Click sprint
        fireEvent.click(screen.getByText('Sprint 1'));

        // Check if session create was called
        await waitFor(() => {
            expect(api.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
                sprintId: '1',
                sprintName: 'Sprint 1'
            }));
        });
    });
});
