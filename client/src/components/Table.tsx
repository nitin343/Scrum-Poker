import React, { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Participant } from '../context/GameContext';

// ============================================================
// TYPES & ENUMS
// ============================================================

type AnimationPhase = 'IDLE' | 'COLLECTING' | 'STACKED' | 'DEALING';

interface TableProps {
    participants: Participant[];
    currentRound: number;
    areCardsRevealed: boolean;
    isScrumMaster: boolean;
    onReveal: () => void;
    onReset: () => void;
    onNextIssue?: () => void;
    isPreEstimated?: boolean;
    savedInJira?: boolean;
    existingEstimate?: string | number;
}

interface Seat {
    participant: Participant;
    side: 'top' | 'bottom' | 'left' | 'right';
    index: number;
    isMe: boolean;
    pos: { x: number; y: number };
}

// ============================================================
// CONFIG
// ============================================================

const CARD_WIDTH = 56;
const CARD_GAP = 40;
const TABLE_GAP = 20; // Increased to 20 for reasonable gap

// ============================================================
// ANIMATION VARIANTS
// ============================================================

const cardVariants = {
    idle: (custom: { pos: { x: number, y: number }, rotation: number, isVoted: boolean }) => ({
        x: custom.pos.x,
        y: custom.pos.y,
        rotate: 0,
        scale: 1,
        transition: {
            type: 'spring' as const,
            stiffness: 180,
            damping: 25
        }
    }),
    collecting: {
        x: 0,
        y: 0,
        rotate: 0, // Reset rotation for clean flight
        rotateY: 0, // Force face down
        scale: 1.1, // Slight pop
        zIndex: 50,
        transition: {
            type: 'spring' as const,
            stiffness: 300,
            damping: 28,
            mass: 0.8
        }
    },
    stacked: (custom: { index: number }) => ({
        x: 0,
        y: 0,
        scale: 1,
        rotate: custom.index * 2 - 5, // Deterministic random-looking rotation
        rotateY: 0,
        zIndex: 100 + custom.index,
        transition: {
            type: 'spring' as const,
            stiffness: 400,
            damping: 30
        }
    }),
    dealing: (custom: { pos: { x: number, y: number }, index: number }) => ({
        x: custom.pos.x,
        y: custom.pos.y,
        rotate: 0,
        rotateY: 0,
        scale: 1,
        zIndex: 10,
        transition: {
            type: 'spring' as const,
            stiffness: 220,
            damping: 25,
            delay: custom.index * 0.05 // Staggered deal
        }
    })
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

const CardVisual: React.FC<{
    isBack: boolean;
    isSelected: boolean;
    value: string | number | null;
    isMe: boolean;
}> = ({ isBack: _isBack, isSelected, value, isMe }) => {
    // Different styles for voted vs not-voted cards
    const backStyle = isSelected
        ? {
            // Voted card - darker pattern
            backgroundColor: '#2A3142',
            backgroundImage: `
                radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 1px, transparent 1px),
                linear-gradient(135deg, #323A4F 0%, #1F2533 100%)
            `,
            backgroundSize: '8px 8px, 100% 100%',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            border: isMe ? '1px solid rgba(244, 162, 29, 0.55)' : '1px solid rgba(255,255,255,0.05)'
        }
        : {
            // Not voted - lighter placeholder
            backgroundColor: '#475569',
            backgroundImage: 'none',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            border: isMe ? '2px dashed rgba(244, 162, 29, 0.6)' : '2px dashed rgba(255,255,255,0.15)'
        };

    return (
        <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
            {/* BACK FACE */}
            <div
                className="absolute inset-0 backface-hidden rounded-[8px]"
                style={{
                    ...backStyle,
                    backfaceVisibility: 'hidden',
                }}
            />

            {/* FRONT FACE */}
            <div
                className="absolute inset-0 backface-hidden rounded-[8px] flex items-center justify-center bg-[#FAF9F6]"
                style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    background: 'linear-gradient(135deg, #FAF9F6 0%, #ECEAE4 100%)',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                }}
            >
                <span className="font-bold text-2xl text-slate-800">{value}</span>
            </div>
        </div>
    );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const Table: React.FC<TableProps> = ({
    participants, currentRound, areCardsRevealed, isScrumMaster, onReveal, onReset, onNextIssue, isPreEstimated, existingEstimate, savedInJira
}) => {
    const myUserId = localStorage.getItem('scrum_poker_user_id');
    const playerCount = participants.length;

    // Animation Phase State
    const [phase, setPhase] = useState<AnimationPhase>('IDLE');

    // Derived: Parallax
    const [parallax, setParallax] = useState({ x: 0, y: 0 });

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const btnX = (e.clientX - rect.left - rect.width / 2) * -0.01;
        const btnY = (e.clientY - rect.top - rect.height / 2) * -0.01;
        setParallax({ x: btnX, y: btnY });
    }, []);

    // Layout Calculations
    const tableDims = useMemo(() => computeTableDimensions(playerCount), [playerCount]);
    const seats = useMemo(() => calculateSeats(participants, myUserId, tableDims.width, tableDims.height), [participants, myUserId, tableDims]);

    // ============================================================
    // ANIMATION LOGIC
    // ============================================================

    const handleAnimationComplete = (phaseName: string, isLastCard: boolean) => {
        if (!isLastCard) return;

        if (phaseName === 'COLLECTING') {
            // All cards are at center - go to stacked
            setPhase('STACKED');

            // After a brief pause, deal the cards back out
            setTimeout(() => {
                setPhase('DEALING');
            }, 400);
        } else if (phaseName === 'DEALING') {
            // Cards are back in position - reset and go idle
            onReset();
            setPhase('IDLE');
        }
    };

    // No useEffect needed - the flow is: COLLECTING → STACKED → DEALING → IDLE


    return (
        <div
            className="relative w-full h-[70vh] min-h-[400px] flex items-center justify-center"
            onMouseMove={handleMouseMove}
        >
            {/* TABLE SURFACE */}
            <motion.div
                className="relative"
                style={{
                    width: tableDims.width,
                    height: tableDims.height,
                    x: parallax.x,
                    y: parallax.y
                }}
            >
                {/* Center Engraving */}


                <div
                    className="absolute inset-0 z-10 transition-opacity duration-300 pointer-events-none"
                    style={{ opacity: phase === 'IDLE' ? 1 : 0 }}
                >
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {/* Pre-Estimated OR Saved Display */}
                        {(isPreEstimated || savedInJira) ? (
                            <div className="relative flex flex-col items-center">
                                <span className="text-sm font-medium text-emerald-400 uppercase tracking-widest mb-1">
                                    ✓ Already Estimated
                                </span>
                                <div className="text-5xl font-black text-emerald-400 mb-2">
                                    {existingEstimate || '—'}
                                </div>
                                {isPreEstimated && !savedInJira && (
                                    <span className="text-xs text-slate-500">
                                        Estimated directly
                                    </span>
                                )}

                                {isScrumMaster && (
                                    <div className="absolute left-[100%] ml-8 top-1/2 -translate-y-1/2 pointer-events-auto whitespace-nowrap">
                                        <button
                                            onClick={() => onNextIssue?.()}
                                            className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-full font-bold text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-95"
                                        >
                                            Next Issue
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="relative flex flex-col items-center justify-center">
                                {/* During voting: Show round text and vote count */}
                                {!areCardsRevealed && !participants.every(p => p.hasVoted) && (
                                    <>
                                        <span className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-1">
                                            Round {currentRound}
                                        </span>
                                        <div className="text-5xl font-black text-white">
                                            {participants.filter(p => p.hasVoted).length}<span className="text-slate-600 text-2xl">/{participants.length}</span>
                                        </div>
                                    </>
                                )}

                                {/* All voted: Show Reveal button (centered) */}
                                {!areCardsRevealed && participants.every(p => p.hasVoted) && isScrumMaster && (
                                    <button
                                        onClick={onReveal}
                                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full font-bold text-xs uppercase tracking-wider transition-colors pointer-events-auto"
                                    >
                                        Reveal
                                    </button>
                                )}

                                {/* After reveal: Show Next Issue button (centered) */}
                                {areCardsRevealed && isScrumMaster && (
                                    <button
                                        onClick={() => onNextIssue?.()}
                                        className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-full font-bold text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-95 pointer-events-auto"
                                    >
                                        Next Issue
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* CARDS */}
                {
                    seats.map((seat, idx) => {
                        const isLast = idx === seats.length - 1;

                        // Logic to show 'cardness'
                        // If IDLE: only show if voted
                        // If COLLECTING/STACKED/DEALING: ALWAYS show (it's the physical object)
                        const shouldRenderCard = phase !== 'IDLE' || seat.participant.hasVoted;

                        return (
                            <motion.div
                                key={seat.participant.userId}
                                custom={{
                                    pos: seat.pos,
                                    index: idx,
                                    isVoted: seat.participant.hasVoted,
                                    rotation: 0
                                }}
                                initial="idle"
                                animate={phase.toLowerCase()}
                                variants={cardVariants}
                                onAnimationComplete={(_definition) => {
                                    // Framer motion returns the variant name or definition object
                                    // We need to map it back to our phase string logic if possible, 
                                    // but relying on the passed phase state is safer.
                                    if (isLast) {
                                        handleAnimationComplete(phase, true);
                                    }
                                }}
                                className="absolute top-1/2 left-1/2 -mt-[40px] -ml-[28px] w-[56px] h-[80px]" // Centered anchor
                                style={{
                                    perspective: 1000,
                                    opacity: isPreEstimated ? 0.3 : (phase === 'IDLE' ? 1 : (shouldRenderCard ? 1 : 0)),
                                    filter: isPreEstimated ? 'grayscale(100%)' : 'none'
                                }}
                            >
                                {/* Inner Visual Component - Handles the flip and content */}
                                <motion.div
                                    className="w-full h-full relative"
                                    style={{ transformStyle: 'preserve-3d' }}
                                    animate={{
                                        rotateY: (phase === 'IDLE' && areCardsRevealed && seat.participant.hasVoted) ? 180 : 0
                                    }}
                                    transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                                >
                                    <CardVisual
                                        isBack={!areCardsRevealed || phase !== 'IDLE'}
                                        isSelected={seat.participant.hasVoted}
                                        isMe={seat.isMe}
                                        value={seat.participant.selectedCard ?? null}
                                    />
                                </motion.div>
                                {/* NAME LABEL - Outside 3D context to stay flat */}
                                <div
                                    className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap z-20 pointer-events-none ${seat.side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
                                    style={{ opacity: phase === 'IDLE' ? 1 : 0, transition: 'opacity 0.2s' }}
                                >
                                    <span
                                        className={`
                                        px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide flex items-center gap-1
                                        ${seat.isMe ? 'bg-amber-600 text-white' :
                                                (seat.participant as any).isBot ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-lg shadow-cyan-500/20' :
                                                    'bg-slate-800/80 text-slate-300'}
                                    `}
                                    >
                                        {(seat.participant as any).isBot && <span className="text-[10px]">🤖</span>}
                                        {seat.isMe ? 'You' : seat.participant.displayName}
                                    </span>
                                    {seat.participant.isConnected === false && !(seat.participant as any).isBot && (
                                        <div className="text-[8px] font-bold text-red-500 mt-1 uppercase tracking-widest text-center animate-pulse">
                                            Offline
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })
                }

            </motion.div >
        </div >
    );
};


// ============================================================
// HELPER FUNCTIONS
// ============================================================

function distributeToSides(totalPlayers: number) {
    if (totalPlayers === 0) return { top: 0, right: 0, bottom: 0, left: 0 };
    if (totalPlayers === 1) return { top: 0, right: 0, bottom: 1, left: 0 };
    if (totalPlayers === 2) return { top: 1, right: 0, bottom: 1, left: 0 };
    if (totalPlayers === 3) return { top: 1, right: 0, bottom: 2, left: 0 };
    if (totalPlayers === 4) return { top: 2, right: 0, bottom: 2, left: 0 };

    // For 5+ players, use left and right sides
    const remaining = totalPlayers - 2; // Reserve 1 left, 1 right
    const topCount = Math.ceil(remaining / 2);
    const bottomCount = Math.floor(remaining / 2);
    return { top: topCount, right: 1, bottom: Math.max(1, bottomCount), left: 1 };
}

function computeTableDimensions(count: number) {
    const sides = distributeToSides(count);
    const maxH = Math.max(sides.top, sides.bottom, 1);
    const w = maxH * CARD_WIDTH + (maxH - 1) * CARD_GAP + 140;
    return { width: Math.max(300, w), height: 200 }; // Increased height to 200
}

function calculateSeats(participants: Participant[], myId: string | null, width: number, height: number): Seat[] {
    const others = participants.filter(p => p.userId !== myId);
    const me = participants.find(p => p.userId === myId);
    const sides = distributeToSides(participants.length);

    const result: Seat[] = [];
    let oIdx = 0;

    // Always place "me" first at center bottom position
    if (me) {
        const mePositionIndex = Math.floor(sides.bottom / 2);
        result.push(createSeat(me, 'bottom', mePositionIndex, width, height, true, sides.bottom));
    }

    // Fill Left side
    for (let i = 0; i < sides.left && oIdx < others.length; i++) {
        result.push(createSeat(others[oIdx++], 'left', i, width, height, false, sides.left));
    }

    // Fill Right side
    for (let i = 0; i < sides.right && oIdx < others.length; i++) {
        result.push(createSeat(others[oIdx++], 'right', i, width, height, false, sides.right));
    }

    // Fill Top side
    for (let i = 0; i < sides.top && oIdx < others.length; i++) {
        result.push(createSeat(others[oIdx++], 'top', i, width, height, false, sides.top));
    }

    // Fill Bottom side (skip the center spot reserved for "me")
    const mePositionIndex = Math.floor(sides.bottom / 2);
    for (let i = 0; i < sides.bottom && oIdx < others.length; i++) {
        if (me && i === mePositionIndex) continue; // Skip me's position
        result.push(createSeat(others[oIdx++], 'bottom', i, width, height, false, sides.bottom));
    }

    return result;
}

function createSeat(p: Participant, side: string, idx: number, w: number, h: number, isMe: boolean, totalOnSide: number = 1): Seat {
    let x = 0, y = 0;

    if (side === 'left') {
        x = -w / 2 - TABLE_GAP;
        y = 0;
    } else if (side === 'right') {
        x = w / 2 + TABLE_GAP;
        y = 0;
    } else if (side === 'top') {
        const totalW = totalOnSide * CARD_WIDTH + (totalOnSide - 1) * CARD_GAP;
        x = (-totalW / 2) + (CARD_WIDTH / 2) + idx * (CARD_WIDTH + CARD_GAP);
        y = -h / 2 - TABLE_GAP;
    } else {
        const totalW = totalOnSide * CARD_WIDTH + (totalOnSide - 1) * CARD_GAP;
        x = (-totalW / 2) + (CARD_WIDTH / 2) + idx * (CARD_WIDTH + CARD_GAP);
        y = h / 2 + TABLE_GAP;
    }

    return { participant: p, side: side as any, index: idx, isMe, pos: { x, y } };
}
