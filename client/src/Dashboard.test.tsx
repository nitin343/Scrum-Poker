import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardPage } from './pages/DashboardPage';
import { AuthProvider } from './context/AuthContext';
import { MemoryRouter } from 'react-router-dom';
import { api } from './services/api';

// Mock API
vi.mock('./services/api', () => ({
    api: {
        sessions: {
            getAll: vi.fn(),
            delete: vi.fn(),
            create: vi.fn()
        },
        jira: {
            getBoards: vi.fn(),
            getSprints: vi.fn()
        }
    }
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock AuthContext to provide a user
vi.mock('./context/AuthContext', async () => {
    const actual = await vi.importActual('./context/AuthContext');
    return {
        ...actual,
        useAuth: () => ({
            user: { displayName: 'Test Master' },
            logout: vi.fn(),
            isAuthenticated: true
        }),
        AuthProvider: ({ children }: any) => <>{children}</>
    };
});

describe('DashboardPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.confirm = vi.fn(() => true); // Auto-confirm deletions

        // Default mocks
        (api.jira.getBoards as any).mockResolvedValue({ success: true, boards: [] });
        (api.jira.getSprints as any).mockResolvedValue({ success: true, sprints: [] });
    });

    it('renders loading state initially', () => {
        (api.sessions.getAll as any).mockResolvedValue(new Promise(() => { })); // Never resolves
        render(
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        );
        expect(screen.getByText('Loading sessions...')).toBeInTheDocument();
    });

    it('renders empty state when no sessions exist', async () => {
        (api.sessions.getAll as any).mockResolvedValue({ success: true, sessions: [] });
        render(
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Create Your First Session')).toBeInTheDocument();
        });
    });

    it('renders list of sessions', async () => {
        const mockSessions = [
            { sessionId: 's1', boardName: 'Board A', sprintName: 'Sprint 1', isActive: true, createdAt: new Date().toISOString() },
            { sessionId: 's2', boardName: 'Board B', sprintName: 'Sprint 2', isActive: false, createdAt: new Date().toISOString() }
        ];
        (api.sessions.getAll as any).mockResolvedValue({ success: true, sessions: mockSessions });

        render(
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Sprint 1')).toBeInTheDocument();
            expect(screen.getByText('Sprint 2')).toBeInTheDocument();
            expect(screen.getByText('Board A')).toBeInTheDocument();
        });
    });

    it('handles session deletion', async () => {
        const mockSessions = [
            { sessionId: 's1', boardName: 'Board A', sprintName: 'Sprint 1', isActive: true, createdAt: new Date().toISOString() }
        ];
        (api.sessions.getAll as any).mockResolvedValue({ success: true, sessions: mockSessions });
        (api.sessions.delete as any).mockResolvedValue({ success: true });

        render(
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText('Sprint 1')).toBeInTheDocument());

        const deleteBtn = screen.getByText('🗑️');
        fireEvent.click(deleteBtn);

        await waitFor(() => {
            expect(api.sessions.delete).toHaveBeenCalledWith('s1');
            expect(screen.queryByText('Sprint 1')).not.toBeInTheDocument();
        });
    });

    it('opens create session modal', async () => {
        (api.sessions.getAll as any).mockResolvedValue({ success: true, sessions: [] });
        (api.jira.getBoards as any).mockResolvedValue({ success: true, boards: [{ id: 1, name: 'B1' }] });

        render(
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText('Create Your First Session')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Create Your First Session'));

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(screen.getByText('Select Jira Board')).toBeInTheDocument();
        });
    });
});
