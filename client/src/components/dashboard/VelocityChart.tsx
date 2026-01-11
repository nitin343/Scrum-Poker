import React from 'react';
import { motion } from 'framer-motion';

// Mock data for initial visualization
const MOCK_DATA = [
    { name: 'Sprint 9', committed: 20, completed: 18 },
    { name: 'Sprint 10', committed: 25, completed: 22 },
    { name: 'Sprint 11', committed: 22, completed: 25 },
    { name: 'Sprint 12', committed: 30, completed: 28 },
];

export const VelocityChart: React.FC = () => {
    // Calculate max value for scaling columns
    const maxPoints = Math.max(...MOCK_DATA.map(d => Math.max(d.committed, d.completed)));

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="glass p-6 rounded-2xl flex flex-col min-h-[300px]"
        >
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-cyan-300">Team Velocity</h2>
                    <p className="text-xs text-zinc-400">Last 4 Sprints</p>
                </div>
                <div className="flex gap-4 text-xs font-medium">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-500/30" />
                        <span className="text-zinc-400">Committed</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400" />
                        <span className="text-white">Completed</span>
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 flex items-end justify-between px-2 gap-4">
                {MOCK_DATA.map((sprint, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end gap-2 group relative">
                        {/* Bars Container */}
                        <div className="flex gap-1 h-[200px] items-end justify-center w-full">

                            {/* Committed Bar */}
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${(sprint.committed / maxPoints) * 100}%` }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="w-1/3 bg-cyan-900/40 rounded-t-sm relative group-hover:bg-cyan-800/50 transition-colors"
                            >
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {sprint.committed}
                                </div>
                            </motion.div>

                            {/* Completed Bar */}
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${(sprint.completed / maxPoints) * 100}%` }}
                                transition={{ duration: 0.6, delay: i * 0.1 + 0.1 }}
                                className="w-1/3 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-md relative shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                            >
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    {sprint.completed}
                                </div>
                            </motion.div>
                        </div>

                        {/* X-Axis Label */}
                        <div className="text-center mt-2 pb-2 border-t border-white/5 pt-2">
                            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest block">
                                {sprint.name}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};
