import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { Table } from '../components/Table';
import { CardDeck } from '../components/CardDeck';
import { VotingResults } from '../components/VotingResults';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

import { IssueDisplay } from '../components/IssueDisplay';

import { Toast } from '../components/Toast';

export function GameRoomPage() {
    const {
        room, isConnected, selectCard, revealCards, resetRound,
        userId, isScrumMaster, joinRoom, joinAsGuest, socket,
        nextIssue, prevIssue, setIssues, isNavigating
    } = useGame();

    const { roomId } = useParams<{ roomId: string }>();
    const [searchParams] = useSearchParams();
    const inviteToken = searchParams.get('token');
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState('');

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({
        message: '',
        type: 'info',
        isVisible: false
    });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type, isVisible: true });
    };

    const handleSyncJira = async () => {
        if (!room || !isScrumMaster) return;
        setIsSyncing(true);
        try {
            const sprintId = (room as any).sprintId;
            const boardId = (room as any).boardId;

            if (!sprintId || !boardId) {
                showToast("Missing sprint details", 'error');
                return;
            }

            const jiraIssues = await api.jira.getSprintIssues(boardId, sprintId);
            console.log('[SYNC] Got Jira issues:', jiraIssues.issues?.length, 'issues');

            await api.sprints.syncJira(sprintId, {
                boardId,
                sprintName: (room as any).sprintName || 'Sprint',
                issues: jiraIssues.issues,
                jiraState: 'active'
            });
            console.log('[SYNC] Sprint synced to backend');

            console.log('[SYNC] Calling setIssues with', jiraIssues.issues?.length, 'issues');
            setIssues(jiraIssues.issues);
            console.log('[SYNC] setIssues called');
            showToast("Synced with Jira successfully!", 'success');

        } catch (err) {
            console.error("Sync failed", err);
            showToast("Failed to sync with Jira", 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        if (!roomId) return;

        // If we are already connected to this room, do nothing
        if (isConnected && room && room.roomId === roomId) {
            return;
        }

        const initRoom = async () => {
            console.log('[GameRoomPage] initRoom triggered for room:', roomId);
            try {
                // Pass inviteToken if available (needed for guests)
                const response = await api.sessions.get(roomId, inviteToken || undefined);
                const session = response.data;

                if (isAuthenticated && user) {
                    // Start/Join as Host
                    joinRoom(roomId, user.displayName || 'Host', true, session.boardName, {
                        boardId: session.boardId,
                        sprintId: session.sprintId,
                        sprintName: session.sprintName,
                        companyId: session.companyId
                    });
                } else {
                    // Guest
                    const guestEnv = sessionStorage.getItem('guest_user');
                    const guest = guestEnv ? JSON.parse(guestEnv) : null;

                    if (guest && guest.sessionId === roomId && guest.displayName) {
                        joinAsGuest(roomId, guest.displayName);
                    } else {
                        // Redirect to guest join page with token
                        const tokenParam = inviteToken ? `?token=${inviteToken}` : '';
                        navigate(`/join/${roomId}${tokenParam}`);
                    }
                }
            } catch (err) {
                console.error("Failed to join room", err);
                setError("Failed to load session details.");
            }
        };

        if (socket || !isAuthenticated) {
            console.log('[GameRoomPage] useEffect check:', {
                hasSocket: !!socket,
                isConnected,
                isAuthenticated,
                roomId
            });

            if (isAuthenticated && (!socket || !isConnected)) {
                console.log('[GameRoomPage] Waiting for socket connection...');
                return;
            }

            initRoom();
        }

    }, [roomId, isAuthenticated, user, socket, isConnected]);

    const copyRoomId = () => {
        if (room) {
            navigator.clipboard.writeText(window.location.href);
            showToast("Invite link copied to clipboard!", 'success');
        }
    };

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-animated text-red-400">
                <div className="text-center">
                    <h2 className="text-xl font-bold">Error</h2>
                    <p>{error}</p>
                    <button onClick={() => navigate('/dashboard')} className="mt-4 px-4 py-2 bg-white/10 rounded">Back to Dashboard</button>
                </div>
            </div>
        );
    }

    if (!room) {
        return (
            <div className="flex h-screen items-center justify-center bg-animated text-white">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-xl font-bold">Connecting to Room...</h2>
                    <p className="text-sm text-zinc-400 mt-2">{roomId}</p>
                </div>
            </div>
        );
    }

    const myParticipant = room.participants.find(p => p.odId === userId || p.userId === userId || p.socketId === socket?.id);

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-animated">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />

            {/* === NAVBAR === */}
            <motion.nav
                initial={{ y: -60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="shrink-0 glass border-b border-white/10 px-4 py-3 lg:px-8 z-50"
            >
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <motion.div
                            className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg"
                            onClick={() => isAuthenticated && navigate('/dashboard')}
                            whileHover={isAuthenticated ? { scale: 1.1, rotate: 5 } : {}}
                            style={{ cursor: isAuthenticated ? 'pointer' : 'default' }}
                        >
                            SP
                        </motion.div>
                        <div>
                            <h1 className="font-bold text-white text-sm leading-tight">{room.roomName || 'Scrum Poker'}</h1>
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium">
                                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                                {isConnected ? 'Online' : 'Connecting...'}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {isScrumMaster && (
                            <button
                                onClick={handleSyncJira}
                                disabled={isSyncing}
                                className="glass px-4 py-2 rounded-full text-xs font-bold text-cyan-400 border border-white/10 hover:border-cyan-500/50 transition-colors flex items-center gap-2"
                            >
                                {isSyncing ? (
                                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <span>↻ Sync Jira</span>
                                )}
                            </button>
                        )}
                        {/* Only Host sees invite help? Guests can copy url too */}
                        <button onClick={copyRoomId} className="glass px-4 py-2 rounded-full text-xs font-mono font-bold text-purple-400 border border-white/10 hover:border-purple-500/50 transition-colors flex items-center gap-2">
                            <span>Invite</span>
                            <span className="text-lg leading-none">🔗</span>
                        </button>
                    </div>
                </div>
            </motion.nav>

            {/* === MAIN CANVAS === */}
            <main className="flex-1 flex flex-col overflow-hidden relative">

                {/* Issue Display Zone - Fixed at top of main area */}
                <div className="shrink-0 py-4 px-8">
                    <IssueDisplay
                        issue={room.currentIssue as any}
                        currentIndex={room.currentIssueIndex}
                        totalIssues={room.totalIssues}
                        isScrumMaster={isScrumMaster}
                        onNext={nextIssue}
                        onPrev={prevIssue}
                        isNavigating={isNavigating}
                    />
                </div>

                {/* Table Zone - Centered in remaining space */}
                <div className="flex-1 flex items-center justify-center overflow-hidden pb-32">
                    <Table
                        participants={room.participants}
                        currentRound={room.currentRound}
                        areCardsRevealed={room.areCardsRevealed}
                        isScrumMaster={isScrumMaster}
                        onReveal={revealCards}
                        onReset={resetRound}
                        onNextIssue={nextIssue}
                        isPreEstimated={room.isPreEstimated}
                        savedInJira={room.savedInJira}
                        existingEstimate={room.currentIssue?.currentPoints || room.currentIssue?.timeEstimate}
                    />
                </div>
            </main>

            {/* === BOTTOM PANEL === */}
            <div className="fixed bottom-0 left-0 right-0 z-40">
                <div className={`py-4 px-4 ${room.areCardsRevealed ? '' : 'glass border-t border-white/10'}`}>
                    <div className="max-w-7xl mx-auto">
                        <AnimatePresence mode="wait">
                            {room.areCardsRevealed ? (
                                <motion.div
                                    key="voting-results"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    <VotingResults
                                        participants={room.participants}
                                        isVisible={true}
                                        isScrumMaster={isScrumMaster}
                                        issueType={room.currentIssue?.issueType}
                                        isAlreadySaved={room.savedInJira}
                                        onSave={async (points) => {
                                            if (room.currentIssue?.issueKey) {
                                                try {
                                                    // 1. Calculate stats for history
                                                    const participantsArr = room.participants;
                                                    const votes = participantsArr
                                                        .filter(p => p.hasVoted && p.selectedCard !== null)
                                                        .map(p => ({
                                                            participantId: p.odId,
                                                            participantName: p.displayName || 'Unknown',
                                                            vote: String(p.selectedCard),
                                                            votedAt: new Date()
                                                        }));

                                                    // content clipped for brevity, using the same logic as before...
                                                    // Calc Average
                                                    const numericVotes = votes
                                                        .map(v => parseFloat(v.vote))
                                                        .filter(n => !isNaN(n));
                                                    const average = numericVotes.length > 0
                                                        ? numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length
                                                        : 0;

                                                    // Calc Agreement
                                                    const counts: Record<string, number> = {};
                                                    votes.forEach(v => counts[v.vote] = (counts[v.vote] || 0) + 1);
                                                    const maxVotes = Math.max(...Object.values(counts), 0);
                                                    const agreement = votes.length > 0 ? (maxVotes / votes.length) * 100 : 0;

                                                    const votingResults = {
                                                        roundNumber: room.currentRound,
                                                        votes,
                                                        average,
                                                        agreement
                                                    };

                                                    const res = await api.jira.updateIssuePoints(
                                                        room.currentIssue.issueKey,
                                                        points,
                                                        room.currentIssue.issueType,
                                                        votingResults,
                                                        (room as any).sprintId
                                                    );

                                                    if (res.success) {
                                                        showToast(`Updated Jira issue ${room.currentIssue.issueKey}`, 'success');
                                                        // Move to next issue after short delay
                                                        setTimeout(() => {
                                                            socket?.emit('next_issue', { roomId });
                                                        }, 1500);
                                                    } else {
                                                        throw new Error(res.error || 'Failed to update Jira');
                                                    }
                                                } catch (err: any) {
                                                    console.error(err);
                                                    showToast(err.message || 'Failed to update Jira', 'error');
                                                }
                                            }
                                        }}
                                        onRevote={() => {
                                            if (confirm('Are you sure you want to discard current votes and re-vote?')) {
                                                socket?.emit('reset_round', { roomId });
                                            }
                                        }}
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="card-deck"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    <CardDeck
                                        selectedValue={myParticipant?.selectedCard}
                                        onSelect={selectCard}
                                        disabled={room.areCardsRevealed}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
