import React from 'react';
import { motion } from 'framer-motion';

// Mock data
const MOCK_WORKLOAD = [
    { name: 'Sarah Wilson', points: 13, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
    { name: 'Mike Chen', points: 8, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike' },
    { name: 'David Kim', points: 21, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David' },
    { name: 'Jessica Lo', points: 5, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jess' },
    { name: 'Unassigned', points: 12, avatar: null },
];

export const WorkloadView: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass p-6 rounded-2xl h-full flex flex-col"
        >
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-amber-300">Workload</h2>
                    <p className="text-xs text-zinc-400">Current Sprint</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                {MOCK_WORKLOAD.map((user, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        className="flex items-center gap-3"
                    >
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!user.avatar ? 'bg-zinc-700' : 'bg-zinc-800'}`}>
                            {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full" />
                            ) : (
                                <span className="text-xs text-zinc-400">?</span>
                            )}
                        </div>

                        {/* Bar Info */}
                        <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-white font-medium">{user.name}</span>
                                <span className={user.points > 13 ? 'text-red-400' : 'text-zinc-400'}>
                                    {user.points} pts
                                </span>
                            </div>
                            {/* Bar */}
                            <div className="h-1.5 w-full bg-zinc-700/50 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min((user.points / 20) * 100, 100)}%` }}
                                    transition={{ duration: 1, delay: 0.6 + i * 0.1 }}
                                    className={`h-full rounded-full ${user.points > 13 ? 'bg-red-500' :
                                            user.points > 8 ? 'bg-amber-500' :
                                                'bg-emerald-500'
                                        }`}
                                />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 text-center">
                <button className="text-xs text-zinc-500 hover:text-white transition-colors">
                    View All Assignments
                </button>
            </div>
        </motion.div>
    );
};
