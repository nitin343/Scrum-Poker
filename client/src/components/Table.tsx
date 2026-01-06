import React, { useMemo } from 'react';
import type { Participant } from '../context/GameContext';

interface TableProps {
    participants: Participant[];
    currentRound: number;
    areCardsRevealed: boolean;
    isScrumMaster: boolean;
    onReveal: () => void;
    onReset: () => void;
}

export const Table: React.FC<TableProps> = ({
    participants, currentRound, areCardsRevealed, isScrumMaster, onReveal, onReset
}) => {
    // Calculate positions dynamically based on count
    const positions = useMemo(() => {
        const count = participants.length;
        if (count === 0) return [];
        return participants.map((_, index) => {
            const angle = (index / count) * 2 * Math.PI - Math.PI / 2; // Start from top
            return {
                x: 50 + 42 * Math.cos(angle), // % coordinates
                y: 50 + 38 * Math.sin(angle)
            };
        });
    }, [participants.length]);

    const votesCount = participants.filter(p => p.hasVoted).length;
    const allVoted = votesCount === participants.length && participants.length > 0;

    return (
        <div className="relative w-full max-w-[800px] aspect-square md:aspect-[4/3] flex items-center justify-center my-auto transition-all duration-700">

            {/* Table Surface */}
            <div className="
                relative z-10 w-48 h-48 md:w-80 md:h-80 lg:w-96 lg:h-96
                rounded-full bg-indigo-600/10 backdrop-blur-xl border border-white/40
                shadow-[0_0_60px_-15px_rgba(79,70,229,0.3)]
                flex flex-col items-center justify-center text-center
                transition-all duration-500 ease-spring
            ">
                {/* Inner Ring */}
                <div className="absolute inset-4 rounded-full border border-indigo-500/20 pointer-events-none"></div>

                <div className="text-indigo-900/40 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs mb-4">
                    Round {currentRound}
                </div>

                {areCardsRevealed ? (
                    isScrumMaster && (
                        <button
                            onClick={onReset}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30 transform transition-all active:scale-95 text-sm md:text-base"
                        >
                            Next Round
                        </button>
                    )
                ) : (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                        <div className="relative mb-2">
                            <span className="text-4xl md:text-6xl font-black bg-gradient-to-br from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                                {votesCount}
                            </span>
                            <span className="text-xl md:text-3xl font-bold text-gray-400">/{participants.length}</span>
                        </div>
                        <div className="text-xs md:text-sm text-gray-500 font-medium">Votes Cast</div>

                        {isScrumMaster && (
                            <button
                                onClick={onReveal}
                                disabled={!allVoted && votesCount === 0}
                                className={`
                                    mt-6 px-5 py-2 rounded-lg text-sm font-bold transition-all
                                    ${allVoted
                                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30 -translate-y-1'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }
                                `}
                            >
                                Reveal Cards
                            </button>
                        )}
                        {!isScrumMaster && !allVoted && (
                            <div className="mt-4 flex items-center gap-2 text-xs text-indigo-500 font-medium bg-indigo-50 px-3 py-1.5 rounded-full animate-pulse">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                Voting in progress
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Participants */}
            {participants.map((p, index) => {
                const pos = positions[index];
                const isMe = p.userId === localStorage.getItem('scrum_poker_user_id');

                return (
                    <div
                        key={p.socketId}
                        className="absolute w-20 md:w-28 flex flex-col items-center transition-all duration-700 ease-spring"
                        style={{
                            left: `${pos?.x || 50}%`,
                            top: `${pos?.y || 50}%`,
                            transform: 'translate(-50%, -50%)',
                        }}
                    >
                        {/* Card Slot */}
                        <div className={`
                            relative mb-3 w-10 h-14 md:w-14 md:h-20 rounded-lg shadow-lg transition-all duration-500
                            flex items-center justify-center perspective-1000 group
                            ${p.hasVoted
                                ? (areCardsRevealed
                                    ? 'bg-white text-indigo-600 -translate-y-2 scale-110 z-20'
                                    : 'bg-gradient-to-br from-indigo-500 to-violet-600 border border-indigo-400')
                                : 'bg-gray-100/50 border-2 border-dashed border-gray-300'
                            }
                        `}>
                            {p.hasVoted && !areCardsRevealed && (
                                <div className="w-full h-full rounded-lg bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEwIDAgTDIwIDEwIEwxMCAyMCBMMCAxMCBaIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-30"></div>
                            )}

                            {areCardsRevealed && (
                                <span className="font-bold text-lg md:text-2xl animate-in zoom-in spin-in-12 duration-500">
                                    {p.selectedCard}
                                </span>
                            )}
                        </div>

                        {/* Avatar/Name */}
                        <div className={`
                            flex items-center gap-1.5 px-3 py-1 md:py-1.5 rounded-full backdrop-blur-md border shadow-sm transition-all
                            ${isMe ? 'bg-indigo-50/90 border-indigo-200' : 'bg-white/90 border-white/60'}
                            ${p.hasVoted && !areCardsRevealed ? 'ring-2 ring-indigo-500/20' : ''}
                        `}>
                            {p.isScrumMaster && <span className="text-[10px]">👑</span>}
                            <span className={`text-[10px] md:text-xs font-bold truncate max-w-[60px] md:max-w-[80px] ${isMe ? 'text-indigo-700' : 'text-gray-700'}`}>
                                {isMe ? 'You' : p.displayName}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
