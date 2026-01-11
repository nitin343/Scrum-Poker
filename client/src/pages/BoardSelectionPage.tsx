import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface Board {
    id: number;
    name: string;
    type: string;
}

export function BoardSelectionPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, updateSelectedBoard } = useAuth();
    const [boards, setBoards] = useState<Board[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const isChangingBoard = location.state?.changeBoard;
        // If user already has a selected board AND not explicitly changing it, redirect to dashboard
        if (user?.selectedBoardId && !isChangingBoard) {
            navigate('/dashboard');
            return;
        }
        fetchBoards();
    }, [user, navigate, location]);

    const fetchBoards = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await api.jira.getBoards();
            if (data.success && data.boards) {
                setBoards(data.boards);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch boards');
        } finally {
            setIsLoading(false);
        }
    };

    const handleContinue = async () => {
        if (!selectedBoard) return;

        setIsSubmitting(true);
        try {
            await updateSelectedBoard(selectedBoard.id.toString());
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to save board selection');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card w-full max-w-[520px] p-8 md:p-12 rounded-3xl relative z-10"
            >
                <div className="text-center mb-8">
                    <motion.div
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 text-white text-3xl mb-4 shadow-lg"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                        🎯
                    </motion.div>
                    <h1 className="text-3xl font-extrabold text-white mb-2">
                        Select Your Board
                    </h1>
                    <p className="text-zinc-400">
                        Choose a Jira board to start your planning session
                    </p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mb-6 p-4 bg-red-500/10 text-red-400 rounded-xl text-sm border border-red-500/20"
                    >
                        {error}
                    </motion.div>
                )}

                <div className="space-y-4">
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="animate-pulse h-16 bg-white/5 rounded-xl" />
                            ))}
                        </div>
                    ) : (
                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {boards.map(board => (
                                <motion.button
                                    key={board.id}
                                    onClick={() => setSelectedBoard(board)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`w-full text-left px-5 py-4 rounded-xl transition-all border cursor-pointer ${selectedBoard?.id === board.id
                                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-500/20'
                                        : 'bg-white/5 border-transparent text-zinc-300 hover:bg-white/10 hover:border-white/10'
                                        }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="font-semibold">{board.name}</div>
                                            <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">
                                                {board.type} • ID: {board.id}
                                            </div>
                                        </div>
                                        {selectedBoard?.id === board.id && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm"
                                            >
                                                ✓
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.button>
                            ))}
                            {boards.length === 0 && (
                                <div className="text-center py-8 text-zinc-500">
                                    No boards found. Please check your Jira connection.
                                </div>
                            )}
                        </div>
                    )}

                    <motion.button
                        onClick={handleContinue}
                        disabled={!selectedBoard || isSubmitting}
                        whileHover={{ scale: selectedBoard ? 1.02 : 1 }}
                        whileTap={{ scale: selectedBoard ? 0.98 : 1 }}
                        className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg mt-6"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Loading...
                            </span>
                        ) : (
                            'Continue to Dashboard'
                        )}
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
}
