import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Participant } from '../context/GameContext';

interface VotingResultsProps {
    participants: Participant[];
    isVisible: boolean;
    isScrumMaster?: boolean;
    issueType?: string;
    onSave?: (points: string | number) => void;
    onRevote?: () => void;
    isAlreadySaved?: boolean;
}

const FIBONACCI = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

const getNearestFibonacci = (num: number) => {
    return FIBONACCI.reduce((prev, curr) =>
        Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev
    );
};

export const VotingResults: React.FC<VotingResultsProps> = ({ participants, isVisible, isScrumMaster, issueType = 'Story', onSave = () => { }, onRevote = () => { }, isAlreadySaved = false }) => {
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

    const [finalScore, setFinalScore] = React.useState<string | number>('');
    const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    // Effect to sync savedStatus with prop
    React.useEffect(() => {
        if (isAlreadySaved) {
            setSaveStatus('success');
        } else {
            setSaveStatus('idle');
        }
    }, [isAlreadySaved, isVisible]);

    // Update final score when average changes or visible
    React.useEffect(() => {
        if (!isVisible || voteData.average === null) return;

        const isBug = issueType.toLowerCase() === 'bug';

        if (isBug) {
            // For bugs, we don't auto-set time from points usually, 
            // but maybe we can default to something or leave empty?
            // User wants "day hour min".
            setFinalScore('');
        } else {
            // Snap to nearest Fibonacci
            const nearest = getNearestFibonacci(voteData.average);
            setFinalScore(nearest);
        }
    }, [voteData.average, isVisible, issueType]);

    if (!isVisible || voteData.distribution.length === 0) return null;

    const maxBarHeight = 50; // Smaller max height
    const isBug = issueType.toLowerCase() === 'bug';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="w-full flex items-end justify-between gap-6"
            >
                {/* LEFT: Vote Distribution Bars */}
                <div className="flex items-end gap-2 justify-start">
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

                {/* CENTER: Average & Agreement */}
                <div className="flex items-center justify-center gap-6">
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

                {/* RIGHT: Scrum Master Controls */}
                {isScrumMaster && (
                    <div className="flex flex-col gap-2 justify-end items-end">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                            Final {isBug ? 'Time' : 'Score'}
                        </span>
                        <div className="flex items-center gap-2">
                            {/* Re-vote Button */}
                            <button
                                onClick={onRevote}
                                className="w-8 h-9 flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white rounded transition-colors"
                                title="Restart Voting"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>

                            {saveStatus === 'success' ? (
                                <div className="flex items-center gap-2">
                                    <div className="bg-green-500/20 border border-green-500/30 px-3 py-1.5 rounded flex items-center gap-2">
                                        <span className="text-green-400 font-bold text-sm">✅ Saved to Jira</span>
                                        <button
                                            onClick={() => setSaveStatus('idle')}
                                            className="text-[10px] text-green-300 hover:text-white underline ml-1"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <input
                                        type={isBug ? "text" : "number"}
                                        value={finalScore}
                                        onChange={(e) => setFinalScore(e.target.value)}
                                        placeholder={isBug ? "e.g. 1d 4h" : "Points"}
                                        className="w-20 px-2 py-2 rounded bg-black/20 border border-white/10 text-white text-sm font-bold focus:outline-none focus:border-purple-500"
                                    />
                                    <button
                                        onClick={async () => {
                                            setSaveStatus('saving');
                                            try {
                                                await onSave(finalScore);
                                                setSaveStatus('success');
                                            } catch (e) {
                                                setSaveStatus('error');
                                                setTimeout(() => setSaveStatus('idle'), 3000);
                                            }
                                        }}
                                        disabled={saveStatus === 'saving'}
                                        className={`px-4 py-2 font-bold rounded-lg text-sm shadow-lg transition-all ${saveStatus === 'saving'
                                            ? 'bg-slate-600 text-slate-300 cursor-wait'
                                            : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'
                                            }`}
                                    >
                                        {saveStatus === 'saving' ? 'Saving...' : 'Save'}
                                    </button>
                                </>
                            )}
                        </div>
                        {saveStatus === 'success' && (
                            <span className="text-[10px] text-green-400 font-bold text-right -mt-1 block animate-pulse">
                                ✓ Updated in Jira
                            </span>
                        )}
                        {saveStatus === 'error' && (
                            <span className="text-[10px] text-red-400 font-bold text-right -mt-1 block">
                                ✗ Failed to update
                            </span>
                        )}
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};
