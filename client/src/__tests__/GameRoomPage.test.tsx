
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GameRoomPage } from '../pages/GameRoomPage';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';

import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Hoist mocks
const mocks = vi.hoisted(() => ({
    getSprintIssues: vi.fn(),
    syncJira: vi.fn(),
    updateIssuePoints: vi.fn(),
    navigate: vi.fn(),
    joinRoom: vi.fn(),
    nextIssue: vi.fn(),
    setIssues: vi.fn()
}));

// Mocks
vi.mock('../context/GameContext');
vi.mock('../context/AuthContext');

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mocks.navigate,
        useParams: () => ({ roomId: 'room-123' }),
    };
});

vi.mock('../services/api', () => ({
    api: {
        sessions: {
            get: vi.fn().mockResolvedValue({
                data: {
                    boardId: 'board-1',
                    sprintId: 'sprint-1',
                    sprintName: 'Test Sprint',
                    companyId: 'company-1'
                }
            })
        },
        jira: {
            getSprintIssues: mocks.getSprintIssues,
            updateIssuePoints: mocks.updateIssuePoints
        },
        sprints: {
            syncJira: mocks.syncJira
        }
    }
}));

// Mock Child Components
vi.mock('../components/IssueDisplay', () => ({
    IssueDisplay: ({ issue, isNavigating, onNext, onPrev }: any) => (
        <div data-testid="issue-display">
            {isNavigating ? 'Loading Issue...' : issue?.summary || 'No Issue'}
            <button onClick={onNext} data-testid="next-btn">Next</button>
            <button onClick={onPrev} data-testid="prev-btn">Prev</button>
        </div>
    )
}));

vi.mock('../components/Table', () => ({
    Table: ({ onReveal, onReset }: any) => (
        <div data-testid="table-component">
            <button onClick={onReveal} data-testid="reveal-btn">Reveal</button>
            <button onClick={onReset} data-testid="reset-btn">Reset</button>
        </div>
    )
}));

vi.mock('../components/CardDeck', () => ({
    CardDeck: ({ onSelect }: any) => (
        <div data-testid="card-deck">
            <button onClick={() => onSelect(5)} data-testid="select-card-5">5</button>
        </div>
    )
}));

vi.mock('../components/VotingResults', () => ({
    VotingResults: ({ onSave }: any) => (
        <div data-testid="voting-results">
            <button onClick={() => onSave(5)} data-testid="save-btn">Save</button>
        </div>
    )
}));

vi.mock('../components/BotAnalysisPanel', () => ({
    BotAnalysisPanel: () => <div data-testid="bot-analysis-panel" />
}));

describe('GameRoomPage', () => {

    // Internal Mocks for useGame
    const mockJoinAsGuest = vi.fn();
    const mockPrevIssue = vi.fn();
    const mockRevealCards = vi.fn();
    const mockResetRound = vi.fn();
    const mockSelectCard = vi.fn();

    const defaultRoom = {
        roomId: 'room-123',
        roomName: 'Test Room',
        boardId: 'board-1',
        sprintId: 'sprint-1',
        participants: [
            { odId: 'user-1', displayName: 'Tester', selectedCard: 5, hasVoted: true }
        ],
        currentRound: 1,
        isRevealAllowed: false,
        areCardsRevealed: false,
        currentIssue: {
            issueKey: 'JIRA-1',
            summary: 'Test Issue',
            issueType: 'Story',
            currentPoints: 0
        },
        currentIssueIndex: 0,
        totalIssues: 5
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Default Auth Mock
        (useAuth as any).mockReturnValue({
            isAuthenticated: true,
            user: { id: 'user-1', displayName: 'Tester' }
        });

        // Default Game Mock
        (useGame as any).mockReturnValue({
            room: defaultRoom,
            isConnected: true,
            joinRoom: mocks.joinRoom,
            joinAsGuest: mockJoinAsGuest,
            nextIssue: mocks.nextIssue,
            prevIssue: mockPrevIssue,
            revealCards: mockRevealCards,
            resetRound: mockResetRound,
            selectCard: mockSelectCard,
            setIssues: mocks.setIssues,
            userId: 'user-1',
            isScrumMaster: true,
            socket: { id: 'socket-1' },
            isNavigating: false
        });

        // API Mocks default
        mocks.getSprintIssues.mockResolvedValue({ issues: [{ id: 1, key: 'JIRA-100', summary: 'New' }] });
        mocks.syncJira.mockResolvedValue({ success: true });
        mocks.updateIssuePoints.mockResolvedValue({ success: true });
    });

    // ... existing code ...

    it('renders room content when room is active', () => {
        render(
            <MemoryRouter>
                <GameRoomPage />
            </MemoryRouter>
        );
        expect(screen.getByText('Test Room')).toBeInTheDocument();
        expect(screen.getByTestId('issue-display')).toHaveTextContent('Test Issue');
        expect(screen.getByTestId('card-deck')).toBeInTheDocument();
    });

    it('calls joinRoom on mount if authenticated and connected', async () => {
        (useGame as any).mockReturnValue({
            room: null,
            isConnected: true,
            joinRoom: mocks.joinRoom,
            socket: { id: 'socket-1' } // socket must exist
        });

        render(
            <MemoryRouter>
                <GameRoomPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(mocks.joinRoom).toHaveBeenCalledWith(
                'room-123',
                'Tester',
                true,
                undefined,
                expect.anything()
            );
        });
    });

    // ... Sync Test ...
    it('triggers Jira data sync API when Sync button is clicked', async () => {
        render(
            <MemoryRouter>
                <GameRoomPage />
            </MemoryRouter>
        );

        // Find Sync Button (only visible to Scrum Master)
        const syncBtn = screen.getByText('↻ Sync Jira');
        fireEvent.click(syncBtn);

        await waitFor(() => {
            expect(mocks.getSprintIssues).toHaveBeenCalledWith('board-1', 'sprint-1');
            expect(mocks.syncJira).toHaveBeenCalled();
            expect(mocks.setIssues).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ key: 'JIRA-100' })]));
        });
    });

    // ... Save Payload Test ...
    it('sends proper payload including voting data when Save is clicked', async () => {
        (useGame as any).mockReturnValue({
            room: { ...defaultRoom, areCardsRevealed: true },
            isConnected: true,
            joinRoom: mocks.joinRoom,
            joinAsGuest: mockJoinAsGuest,
            nextIssue: mocks.nextIssue,
            prevIssue: mockPrevIssue,
            revealCards: mockRevealCards,
            resetRound: mockResetRound,
            selectCard: mockSelectCard,
            setIssues: mocks.setIssues,
            userId: 'user-1',
            isScrumMaster: true,
            socket: { id: 'socket-1' },
            isNavigating: false
        });

        render(
            <MemoryRouter>
                <GameRoomPage />
            </MemoryRouter>
        );

        // Click Save in VotingResults
        fireEvent.click(screen.getByTestId('save-btn'));

        await waitFor(() => {
            expect(mocks.updateIssuePoints).toHaveBeenCalledWith(
                'JIRA-1', // Ticket Number/Key
                5, // Points
                'Story', // Type
                expect.objectContaining({
                    roundNumber: 1,
                    // Check payload contains user data (votes)
                    votes: expect.arrayContaining([
                        expect.objectContaining({
                            participantId: 'user-1',
                            participantName: 'Tester',
                            vote: "5"
                        })
                    ])
                }),
                'sprint-1' // Add missing sprintId argument
            );
        });
    });

    // ... Navigation Test ...
    it('calls navigation API (nextIssue) to fetch fresh data', () => {
        render(
            <MemoryRouter>
                <GameRoomPage />
            </MemoryRouter>
        );
        const nextBtn = screen.getByTestId('next-btn');
        fireEvent.click(nextBtn);

        expect(mocks.nextIssue).toHaveBeenCalled();
    });

    it('calls navigation API (prevIssue) to fetch fresh data', () => {
        render(
            <MemoryRouter>
                <GameRoomPage />
            </MemoryRouter>
        );
        const prevBtn = screen.getByTestId('prev-btn');
        fireEvent.click(prevBtn);

        expect(mockPrevIssue).toHaveBeenCalled();
    });

    it('calls reveal API (revealCards) to show voting results', () => {
        render(
            <MemoryRouter>
                <GameRoomPage />
            </MemoryRouter>
        );
        const revealBtn = screen.getByTestId('reveal-btn');
        fireEvent.click(revealBtn);

        expect(mockRevealCards).toHaveBeenCalled();
    });

});
