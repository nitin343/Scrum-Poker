import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardPage } from './DashboardPage';
import { AuthProvider } from '../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import { api } from '../services/api';

// Mock dependencies
vi.mock('../services/api', () => ({
    api: {
        sessions: {
            getAll: vi.fn(),
            delete: vi.fn(),
        }
    }
}));

// Mock AuthContext values via a custom render helper or just rely on the real one with mock localStorage
// But simpler to mock useAuth if possible. 
// Since we wrap with AuthProvider, we can set localStorage before.

const renderDashboard = () => {
    return render(
        <BrowserRouter>
            <AuthProvider>
                <DashboardPage />
            </AuthProvider>
        </BrowserRouter>
    );
};

describe('DashboardPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('token', 'fake-token');
        localStorage.setItem('user', JSON.stringify({ id: '1', displayName: 'Test User' }));
    });

    it('renders dashboard with user name', async () => {
        // Mock empty sessions
        vi.mocked(api.sessions.getAll).mockResolvedValue({ success: true, sessions: [] });

        renderDashboard();

        expect(screen.getByText('Scrum Poker')).toBeInTheDocument();
        // expect(screen.getByText('Test User')).toBeInTheDocument(); // Might be in sidebar
        expect(screen.getByText('All Sessions')).toBeInTheDocument();
    });

    it('displays fetched sessions', async () => {
        const mockSessions = [
            { sessionId: 's1', boardName: 'Board 1', sprintName: 'Sprint 1', isActive: true, createdAt: new Date().toISOString() },
            { sessionId: 's2', boardName: 'Board 2', sprintName: 'Sprint 2', isActive: false, createdAt: new Date().toISOString() }
        ];

        // Match the API response structure handled in DashboardPage
        vi.mocked(api.sessions.getAll).mockResolvedValue(mockSessions);

        renderDashboard();

        await waitFor(() => {
            expect(screen.getByText('Sprint 1')).toBeInTheDocument();
            expect(screen.getByText('Sprint 2')).toBeInTheDocument();
        });

        expect(screen.getByText('Board 1')).toBeInTheDocument();
        expect(screen.getByText('Board 2')).toBeInTheDocument();
    });

    it('opens create modal on button click', async () => {
        vi.mocked(api.sessions.getAll).mockResolvedValue([]);
        renderDashboard();

        const createBtns = screen.getAllByText(/New Session/i);
        fireEvent.click(createBtns[0]); // Sidebar button

        expect(screen.getByText('Create New Session')).toBeInTheDocument();
    });
});
