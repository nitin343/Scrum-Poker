import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateSessionModal } from './CreateSessionModal';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
    api: {
        jira: {
            getBoards: vi.fn(),
            getSprints: vi.fn(),
        },
        sessions: {
            create: vi.fn(),
        }
    }
}));

describe('CreateSessionModal', () => {
    const mockOnClose = vi.fn();
    const mockOnCreated = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders nothing when closed', () => {
        render(<CreateSessionModal isOpen={false} onClose={mockOnClose} onSessionCreated={mockOnCreated} />);
        expect(screen.queryByText('Create New Session')).not.toBeInTheDocument();
    });

    it('fetches and displays boards when open', async () => {
        vi.mocked(api.jira.getBoards).mockResolvedValue({ success: true, boards: [{ id: 1, name: 'Board A', type: 'scrum' }] });

        render(<CreateSessionModal isOpen={true} onClose={mockOnClose} onSessionCreated={mockOnCreated} />);

        expect(screen.getByText('Create New Session')).toBeInTheDocument();
        expect(api.jira.getBoards).toHaveBeenCalled();

        await waitFor(() => {
            expect(screen.getByText('Board A')).toBeInTheDocument();
        });
    });

    it('fetches sprints when board selected', async () => {
        vi.mocked(api.jira.getBoards).mockResolvedValue({ success: true, boards: [{ id: 1, name: 'Board A', type: 'scrum' }] });
        vi.mocked(api.jira.getSprints).mockResolvedValue({ success: true, sprints: [{ id: 101, name: 'Sprint 1', state: 'active' }] });

        render(<CreateSessionModal isOpen={true} onClose={mockOnClose} onSessionCreated={mockOnCreated} />);

        await waitFor(() => screen.getByText('Board A'));
        fireEvent.click(screen.getByText('Board A'));

        expect(api.jira.getSprints).toHaveBeenCalledWith(1);

        await waitFor(() => {
            expect(screen.getByText('Sprint 1')).toBeInTheDocument();
        });
    });

    it('creates session when sprint selected and launched', async () => {
        vi.mocked(api.jira.getBoards).mockResolvedValue({ success: true, boards: [{ id: 1, name: 'Board A', type: 'scrum' }] });
        vi.mocked(api.jira.getSprints).mockResolvedValue({ success: true, sprints: [{ id: 101, name: 'Sprint 1', state: 'active' }] });
        vi.mocked(api.sessions.create).mockResolvedValue({ success: true });

        render(<CreateSessionModal isOpen={true} onClose={mockOnClose} onSessionCreated={mockOnCreated} />);

        // Select Board
        await waitFor(() => screen.getByText('Board A'));
        fireEvent.click(screen.getByText('Board A'));

        // Select Sprint
        await waitFor(() => screen.getByText('Sprint 1'));
        fireEvent.click(screen.getByText('Sprint 1')); // Select sprint logic might need check if it matches EXACTLY the button text
        // Note: The sprint button text contains name and state. 
        // "Sprint 1" might target the name div.

        // Launch
        fireEvent.click(screen.getByText('Launch Session'));

        await waitFor(() => {
            expect(api.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
                boardId: '1',
                sprintId: '101'
            }));
            expect(mockOnCreated).toHaveBeenCalled();
            expect(mockOnClose).toHaveBeenCalled();
        });
    });
});
