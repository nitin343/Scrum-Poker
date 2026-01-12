import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BotAnalysisPanel } from '../BotAnalysisPanel';
import { GameContext } from '../../context/GameContext';

// Mock scrollIntoView
beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
});

// Mock socket
const mockSocket = {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
} as any;

// Test wrapper with GameProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
    const mockGameContext = {
        socket: mockSocket,
        isConnected: true,
        room: {
            roomId: 'test-room',
            roomName: 'Test Room',
            participants: [
                {
                    userId: 'test-user',
                    odId: 'test-user',
                    displayName: 'Test User',
                    isScrumMaster: false,
                    socketId: 'test-socket',
                    hasVoted: false,
                    isConnected: true,
                    selectedCard: null
                }
            ],
            currentRound: 1,
            isRevealAllowed: true,
            areCardsRevealed: false
        },
        activeUserCount: 1,
        userId: 'test-user',
        isScrumMaster: false,
        joinRoom: vi.fn(),
        joinAsGuest: vi.fn(),
        leaveRoom: vi.fn(),
        selectCard: vi.fn(),
        revealCards: vi.fn(),
        resetRound: vi.fn(),
        nextIssue: vi.fn(),
        prevIssue: vi.fn(),
        goToIssue: vi.fn(),
        saveEstimate: vi.fn(),
        setIssues: vi.fn(),
        assignPoints: vi.fn(),
        isNavigating: false,
        error: null,
    };

    return (
        <GameContext.Provider value={mockGameContext}>
            {children}
        </GameContext.Provider>
    );
};

describe('BotAnalysisPanel', () => {

    const mockAnalysis = {
        story_points: 8,
        confidence: 'high' as const,
        reasoning: 'The task is well-defined and similar to previous work.',
        risk_factors: ['Minor dependency update required']
    };

    it('should not render when not visible', () => {
        render(
            <TestWrapper>
                <BotAnalysisPanel analysis={mockAnalysis} isVisible={false} onClose={vi.fn()} roomId="test-room" />
            </TestWrapper>
        );

        const header = screen.queryByText('AI Co-pilot');
        expect(header).toBeNull();
    });

    it('should render analysis data when visible', () => {
        render(
            <TestWrapper>
                <BotAnalysisPanel analysis={mockAnalysis} isVisible={true} onClose={vi.fn()} roomId="test-room" />
            </TestWrapper>
        );

        expect(screen.getByText('AI Co-pilot')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument(); // Story Points
        expect(screen.getByText(/The task is well-defined/)).toBeInTheDocument(); // Reasoning
        expect(screen.getByText('Minor dependency update required')).toBeInTheDocument(); // Risk Factor
        expect(screen.getByText(/high confidence/i)).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
        const onClose = vi.fn();
        render(
            <TestWrapper>
                <BotAnalysisPanel analysis={mockAnalysis} isVisible={true} onClose={onClose} roomId="test-room" />
            </TestWrapper>
        );

        const closeButton = screen.getByText('✕');
        fireEvent.click(closeButton);

        expect(onClose).toHaveBeenCalled();
    });
});
