import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface Sprint {
    id: number;
    name: string;
    state: string;
}

// Simple debounce to prevent React Strict Mode double-fetch
let lastFetchTime = 0;

export function DashboardPage() {
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [isLoadingSprints, setIsLoadingSprints] = useState(true);
    const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);

    useEffect(() => {
        // Redirect to board selection if no board selected
        if (!user?.selectedBoardId) {
            navigate('/select-board');
            return;
        }

        // Debounce fetch (1 second)
        const now = Date.now();
        if (now - lastFetchTime < 1000) {
            console.log('Skipping duplicate fetchSprints');
            return;
        }
        lastFetchTime = now;

        fetchSprints();
    }, [user, navigate]);

    const fetchSprints = async () => {
        if (!user?.selectedBoardId) return;

        setIsLoadingSprints(true);
        try {
            const data = await api.jira.getSprints(user.selectedBoardId);
            if (data.success && data.sprints) {
                setSprints(data.sprints);
            }
        } catch (error) {
            console.error('Failed to fetch sprints:', error);
        } finally {
            setIsLoadingSprints(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/auth');
    };

    const handleSprintSelect = async (sprint: Sprint) => {
        setSelectedSprint(sprint);

        try {
            // Create a session for this sprint
            const session = await api.sessions.create({
                boardId: user?.selectedBoardId,
                boardName: `Board ${user?.selectedBoardId}`,
                sprintId: sprint.id.toString(),
                sprintName: sprint.name
            });

            // Navigate to game room with the session ID and token
            navigate(`/room/${session.data.sessionId}?token=${session.data.inviteToken}`);
        } catch (error: any) {
            console.error('Failed to create session:', error);
            alert(error.message || 'Failed to start session');
        }
    };

    const handleChangeBoard = () => {
        // Clear selected board and go back to selection
        navigate('/select-board');
    };

    return (
        <div className="flex h-screen bg-animated text-white overflow-hidden">
            {/* === SIDEBAR === */}
            <aside className="w-80 glass border-r border-white/10 flex-col hidden md:flex z-20">
                <div className="p-6 border-b border-white/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg">
                        SP
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-tight">Scrum Poker</h1>
                        <span className="text-xs text-zinc-400 font-medium">Enterprise Edition</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* User Profile */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center font-bold text-zinc-300">
                                {user?.displayName?.charAt(0) || 'U'}
                            </div>
                            <div>
                                <div className="font-semibold">{user?.displayName}</div>
                                <div className="text-xs text-zinc-400">Scrum Master</div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleChangeBoard}
                                className="flex-1 py-2 text-xs font-medium text-purple-400 hover:text-white bg-white/5 hover:bg-purple-500/20 rounded-lg transition-colors border border-white/5"
                            >
                                Change Board
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex-1 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>

                    {/* Sprints List */}
                    <nav className="space-y-2">
                        <div className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-2 mb-2">
                            Sprints
                        </div>
                        {isLoadingSprints ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="animate-pulse h-12 bg-white/5 rounded-xl" />
                                ))}
                            </div>
                        ) : sprints.length > 0 ? (
                            sprints.map(sprint => (
                                <motion.button
                                    key={sprint.id}
                                    onClick={() => handleSprintSelect(sprint)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${selectedSprint?.id === sprint.id
                                        ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/10 text-white border border-purple-500/20'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                                        }`}
                                >
                                    <span className="opacity-80">🏃</span>
                                    <div className="flex-1 text-left">
                                        <div className="truncate">{sprint.name}</div>
                                        <div className={`text-[10px] uppercase tracking-wider ${sprint.state === 'active' ? 'text-green-400' : 'text-zinc-500'
                                            }`}>
                                            {sprint.state}
                                        </div>
                                    </div>
                                </motion.button>
                            ))
                        ) : (
                            <div className="text-center py-4 text-zinc-500 text-sm">
                                No sprints found for this board
                            </div>
                        )}
                    </nav>
                </div>
            </aside>

            {/* === MAIN CONTENT === */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

                {/* Header */}
                <header className="h-20 shrink-0 px-8 flex items-center justify-between z-10">
                    <h2 className="text-2xl font-bold tracking-tight">
                        Board: {user?.selectedBoardId || 'None Selected'}
                    </h2>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto px-8 pb-8 z-10 scrollbar-hide">
                    <AnimatePresence>
                        {sprints.length === 0 && !isLoadingSprints ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center justify-center h-full text-center"
                            >
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-4xl mb-6">
                                    🏃
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">No Sprints Found</h3>
                                <p className="text-zinc-400 max-w-md">
                                    This board doesn't have any sprints yet. Create a sprint in Jira to get started.
                                </p>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center justify-center h-full text-center"
                            >
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-4xl mb-6">
                                    👈
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Select a Sprint</h3>
                                <p className="text-zinc-400 max-w-md">
                                    Choose a sprint from the sidebar to start your planning poker session
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
