import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export const QuickActions: React.FC = () => {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (roomId.trim()) {
            navigate(`/room/${roomId.trim()}`);
        }
    };

    const handleInstantSession = () => {
        navigate('/select-board');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass p-6 rounded-2xl relative overflow-hidden group"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-purple-500/20 transition-all duration-500" />

            <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                <span className="text-xl">⚡</span> Quick Actions
            </h2>

            <div className="flex flex-col sm:flex-row gap-4">
                <form onSubmit={handleJoin} className="flex-1 flex gap-2">
                    <input
                        type="text"
                        placeholder="Paste Room ID..."
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors placeholder:text-zinc-600"
                    />
                    <button
                        type="submit"
                        disabled={!roomId.trim()}
                        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium text-sm transition-all"
                    >
                        Join
                    </button>
                </form>

                <button
                    onClick={handleInstantSession}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 group/btn"
                >
                    <span>➕</span>
                    Start New Session
                </button>
            </div>
        </motion.div>
    );
};
