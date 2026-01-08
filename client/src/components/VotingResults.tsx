import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Participant } from '../context/GameContext';

interface VotingResultsProps {
    participants: Participant[];
    isVisible: boolean;
}

export const VotingResults: React.FC<VotingResultsProps> = ({ participants, isVisible }) => {
    // Calculate vote distribution
    const voteData = useMemo(() => {
        const votes: Record<string, number> = {};
        let numericVotes: number[] = [];

        participants.forEach(p => {
            if (p.hasVoted && p.selectedCard !== null) {
                const cardValue = String(p.selectedCard);
                votes[cardValue] = (votes[cardValue] || 0) + 1;

                // Collect numeric votes for average calculation
                const numVal = parseFloat(String(p.selectedCard));
                if (!isNaN(numVal)) {
                    numericVotes.push(numVal);
                }
            }
        });

        // Sort by card value (numeric first, then special cards)
        const sortedEntries = Object.entries(votes).sort((a, b) => {
            const aNum = parseFloat(a[0]);
            const bNum = parseFloat(b[0]);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            if (!isNaN(aNum)) return -1;
            if (!isNaN(bNum)) return 1;
            return a[0].localeCompare(b[0]);
        });

        // Calculate average
        const average = numericVotes.length > 0
            ? numericVotes.reduce((sum, v) => sum + v, 0) / numericVotes.length
            : null;

        // Calculate agreement (how many voted for the most popular option)
        const maxVotes = Math.max(...Object.values(votes), 0);
        const totalVotes = Object.values(votes).reduce((sum, v) => sum + v, 0);
        const agreementPercent = totalVotes > 0 ? (maxVotes / totalVotes) * 100 : 0;

        return {
            distribution: sortedEntries,
            average,
            agreementPercent,
            maxVotes,
            totalVotes
        };
    }, [participants]);

    if (!isVisible || voteData.distribution.length === 0) return null;

    const maxBarHeight = 50; // Smaller max height

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex items-end justify-center gap-6"
            >
                {/* Vote Distribution Bars */}
                <div className="flex items-end gap-2">
                    {voteData.distribution.map(([value, count]) => {
                        const barHeight = (count / voteData.maxVotes) * maxBarHeight;
                        return (
                            <motion.div
                                key={value}
                                initial={{ opacity: 0, scaleY: 0 }}
                                animate={{ opacity: 1, scaleY: 1 }}
                                transition={{ duration: 0.4, delay: 0.1 }}
                                className="flex flex-col items-center"
                                style={{ originY: 1 }}
                            >
                                {/* Bar */}
                                <div
                                    className="w-2 rounded-t-full bg-slate-400 mb-1"
                                    style={{ height: barHeight }}
                                />
                                {/* Card */}
                                <div className="w-10 h-12 rounded-md bg-white/95 flex items-center justify-center shadow-md border border-slate-200">
                                    <span className="font-bold text-base text-slate-800">{value}</span>
                                </div>
                                {/* Vote count */}
                                <span className="text-[10px] text-slate-400 mt-1">
                                    {count} {count === 1 ? 'Vote' : 'Votes'}
                                </span>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Average & Agreement */}
                <div className="flex items-center gap-6 ml-4">
                    {/* Average */}
                    {voteData.average !== null && (
                        <div className="text-center">
                            <span className="text-xs text-slate-400 block">Average</span>
                            <span className="text-3xl font-black text-white">{voteData.average.toFixed(1)}</span>
                        </div>
                    )}

                    {/* Agreement */}
                    <div className="text-center">
                        <span className="text-xs text-slate-400 block mb-1">Agreement</span>
                        <div className="relative w-11 h-11">
                            {/* Background circle */}
                            <svg className="w-full h-full -rotate-90">
                                <circle
                                    cx="22"
                                    cy="22"
                                    r="18"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.1)"
                                    strokeWidth="3"
                                />
                                {/* Progress circle */}
                                <circle
                                    cx="22"
                                    cy="22"
                                    r="18"
                                    fill="none"
                                    stroke={voteData.agreementPercent >= 80 ? '#10b981' : voteData.agreementPercent >= 50 ? '#f59e0b' : '#ef4444'}
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeDasharray={`${(voteData.agreementPercent / 100) * 113.1} 113.1`}
                                />
                            </svg>
                            {/* Center percent */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white">{Math.round(voteData.agreementPercent)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
