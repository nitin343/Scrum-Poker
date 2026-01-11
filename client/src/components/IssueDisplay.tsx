import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';

interface Issue {
    issueKey: string;
    summary?: string;
    description?: string;
    issueType: string;
    currentPoints?: string | number;
    assignee?: {
        displayName: string;
    };
}

interface IssueDisplayProps {
    issue: Issue | undefined;
    currentIndex?: number;
    totalIssues?: number;
    isScrumMaster: boolean;
    onNext: () => void;
    onPrev: () => void;
    isNavigating?: boolean;
}

export const IssueDisplay: React.FC<IssueDisplayProps> = ({
    issue, currentIndex = 0, totalIssues = 0, isScrumMaster, onNext, onPrev, isNavigating = false
}) => {
    // Local state to hold full issue details if fetched
    const [fullIssue, setFullIssue] = useState<Issue | undefined>(issue);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Sync prop changes to state
    useEffect(() => {
        setFullIssue(issue);
    }, [issue]);

    // Fetch details if summary is missing or we just want fresh data
    useEffect(() => {
        if (issue?.issueKey && (!issue.summary || issue.summary === '')) {
            const fetchDetails = async () => {
                setIsLoadingDetails(true);
                try {
                    const response = await api.jira.getIssue(issue.issueKey);
                    if (response.success && response.issue) {
                        setFullIssue(prev => ({
                            ...prev!,
                            summary: response.issue.fields.summary,
                            description: response.issue.fields.description,
                            assignee: response.issue.fields.assignee ? {
                                displayName: response.issue.fields.assignee.displayName
                            } : undefined
                        }));
                    }
                } catch (err) {
                    console.error("Failed to fetch full issue details", err);
                } finally {
                    setIsLoadingDetails(false);
                }
            };
            fetchDetails();
        }
    }, [issue?.issueKey]);

    // Get issue type color
    const getTypeColor = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'bug': return 'bg-red-500/20 text-red-300 border-red-500/30';
            case 'story': return 'bg-green-500/20 text-green-300 border-green-500/30';
            case 'task': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            default: return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
        }
    };

    // Use fullIssue for display, fallback to issue prop if needed
    const displayIssue = fullIssue || issue;

    return (
        <div className="relative w-full">
            {/* Fixed Navigation Arrows - Carousel Style */}
            {isScrumMaster && totalIssues > 0 && (
                <>
                    {/* Left Arrow - Fixed at center-left of viewport */}
                    <button
                        onClick={onPrev}
                        disabled={currentIndex <= 0 || isNavigating}
                        className="fixed left-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110"
                        aria-label="Previous issue"
                    >
                        {isNavigating ? (
                            <span className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        )}
                    </button>

                    {/* Right Arrow - Fixed at center-right of viewport */}
                    <button
                        onClick={onNext}
                        disabled={currentIndex >= (totalIssues - 1) || isNavigating}
                        className="fixed right-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110"
                        aria-label="Next issue"
                    >
                        {isNavigating ? (
                            <span className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        )}
                    </button>
                </>
            )}

            {/* Issue Content - Inline with background */}
            <div className="text-center pt-2 pb-4 min-h-[140px]">
                <AnimatePresence mode="popLayout">
                    {displayIssue ? (
                        <motion.div
                            key={displayIssue.issueKey}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                        >
                            {/* Issue metadata row */}
                            <div className="flex items-center justify-center gap-3 mb-2">
                                <span className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border ${getTypeColor(displayIssue.issueType)}`}>
                                    {displayIssue.issueType}
                                </span>
                                <a
                                    href={`https://agileworld.siemens.cloud/jira/browse/${displayIssue.issueKey}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-mono text-cyan-400 hover:text-cyan-300 hover:underline transition-colors cursor-pointer"
                                    title="Open in Jira"
                                >
                                    {displayIssue.issueKey} ↗
                                </a>
                                <span className="text-sm text-zinc-500">
                                    • {currentIndex + 1} / {totalIssues}
                                </span>
                            </div>

                            {/* Issue title - full width with 40px side padding */}
                            <h2 className="text-2xl font-bold text-white leading-tight mb-1 w-full px-10">
                                {isLoadingDetails ? (
                                    <span className="animate-pulse">Loading details...</span>
                                ) : (
                                    displayIssue.summary || <span className="text-zinc-500 italic">No summary available</span>
                                )}
                            </h2>

                            {/* Assignee */}
                            <div className="text-sm text-zinc-500 mt-1">
                                {displayIssue.assignee ? (
                                    <span>👤 {displayIssue.assignee.displayName}</span>
                                ) : (
                                    <span className="italic">Unassigned</span>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-4"
                        >
                            <p className="text-zinc-500">
                                {isScrumMaster
                                    ? 'No active issue. Click "Sync Jira" to load issues.'
                                    : 'Waiting for host to select an issue...'}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Progress bar - subtle line at bottom */}
                {totalIssues > 0 && (
                    <div className="mt-4 max-w-md mx-auto">
                        <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${((currentIndex + 1) / totalIssues) * 100}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
