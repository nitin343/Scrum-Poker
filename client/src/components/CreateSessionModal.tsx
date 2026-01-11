import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';

interface CreateSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSessionCreated: () => void;
}

interface Board {
    id: number;
    name: string;
    type: string;
}

interface Sprint {
    id: number;
    name: string;
    state: string;
}

export function CreateSessionModal({ isOpen, onClose, onSessionCreated }: CreateSessionModalProps) {
    const [boards, setBoards] = useState<Board[]>([]);
    const [availableSprints, setAvailableSprints] = useState<Sprint[]>([]);

    const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
    const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);

    const [isLoadingBoards, setIsLoadingBoards] = useState(false);
    const [isLoadingSprints, setIsLoadingSprints] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchBoards();
        } else {
            // Reset state on close
            setSelectedBoard(null);
            setSelectedSprint(null);
            setAvailableSprints([]);
            setError(null);
        }
    }, [isOpen]);

    const fetchBoards = async () => {
        setIsLoadingBoards(true);
        setError(null);
        try {
            const data = await api.jira.getBoards();
            if (data.success && data.boards) {
                setBoards(data.boards);
            }
        } catch (err: any) {
            console.error('Failed to fetch boards', err);
            // Fallback for demo if API fails/is not connected
            setError('Failed to fetch boards from Jira. Ensure you are connected.');
        } finally {
            setIsLoadingBoards(false);
        }
    };

    const handleBoardSelect = async (board: Board) => {
        setSelectedBoard(board);
        setSelectedSprint(null);
        setIsLoadingSprints(true);
        try {
            const data = await api.jira.getSprints(board.id);
            if (data.success && data.sprints) {
                setAvailableSprints(data.sprints);
            }
        } catch (err) {
            console.error('Failed to fetch sprints', err);
            setError('Failed to fetch sprints.');
        } finally {
            setIsLoadingSprints(false);
        }
    };

    const handleCreate = async () => {
        if (!selectedBoard || !selectedSprint) return;

        setIsCreating(true);
        setError(null);

        try {
            await api.sessions.create({
                boardId: selectedBoard.id.toString(),
                boardName: selectedBoard.name,
                sprintId: selectedSprint.id.toString(),
                sprintName: selectedSprint.name
            });
            onSessionCreated();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create session');
            setIsCreating(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
                    >
                        <div className="glass-card w-full max-w-lg p-6 rounded-2xl pointer-events-auto shadow-2xl border border-white/10 bg-[#1a1b26]">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white">Create New Session</h2>
                                <button onClick={onClose} className="text-zinc-400 hover:text-white">✕</button>
                            </div>

                            <div className="space-y-6">
                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}

                                {/* Step 1: Select Board */}
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Select Jira Board</label>
                                    {isLoadingBoards ? (
                                        <div className="animate-pulse h-10 bg-white/5 rounded-xl" />
                                    ) : (
                                        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                            {boards.map(board => (
                                                <button
                                                    key={board.id}
                                                    onClick={() => handleBoardSelect(board)}
                                                    className={`w-full text-left px-4 py-3 rounded-xl transition-all border ${selectedBoard?.id === board.id
                                                        ? 'bg-purple-600/20 border-purple-500 text-white'
                                                        : 'bg-white/5 border-transparent text-zinc-300 hover:bg-white/10 hover:border-white/10'
                                                        }`}
                                                >
                                                    <div className="font-semibold text-sm">{board.name} - <span className="text-zinc-400">{board.id}</span></div>
                                                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">{board.type}</div>
                                                </button>
                                            ))}
                                            {boards.length === 0 && (
                                                <div className="text-zinc-500 text-sm p-2 text-center">No boards found</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Step 2: Select Sprint */}
                                {selectedBoard && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                    >
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">Select Active Sprint</label>
                                        {isLoadingSprints ? (
                                            <div className="animate-pulse h-10 bg-white/5 rounded-xl" />
                                        ) : (
                                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                                {availableSprints.map(sprint => (
                                                    <button
                                                        key={sprint.id}
                                                        onClick={() => setSelectedSprint(sprint)}
                                                        disabled={sprint.state === 'closed'}
                                                        className={`w-full text-left px-4 py-3 rounded-xl transition-all border ${selectedSprint?.id === sprint.id
                                                            ? 'bg-cyan-600/20 border-cyan-500 text-white'
                                                            : sprint.state === 'closed'
                                                                ? 'opacity-50 cursor-not-allowed bg-white/5 border-transparent'
                                                                : 'bg-white/5 border-transparent text-zinc-300 hover:bg-white/10 hover:border-white/10'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-semibold text-sm">{sprint.name}</span>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${sprint.state === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-500'
                                                                }`}>
                                                                {sprint.state}
                                                            </span>
                                                        </div>
                                                    </button>
                                                ))}
                                                {availableSprints.length === 0 && (
                                                    <div className="text-zinc-500 text-sm p-2 text-center">No sprints found for this board</div>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        disabled={!selectedBoard || !selectedSprint || isCreating}
                                        className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isCreating ? 'Creating...' : 'Launch Session'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
