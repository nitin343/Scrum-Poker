import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Participant } from '../context/GameContext';

interface TableProps {
    participants: Participant[];
    currentRound: number;
    areCardsRevealed: boolean;
    isScrumMaster: boolean;
    onReveal: () => void;
    onReset: () => void;
}

// ============================================================
// SEATING CONFIG
// ============================================================

const CARD_WIDTH = 56;
const CARD_HEIGHT = 80;
const CARD_GAP = 40;
const TABLE_GAP = 20;

// Table surface styling - Minimal/Transparent
const TABLE_STYLE = {
    surface: 'transparent',
    rim: 'transparent',
    rimShadow: 'none',
    textColor: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.6)',
};

interface Seat {
    participant: Participant;
    side: 'top' | 'bottom' | 'left' | 'right';
    index: number;
    isMe: boolean;
}

function distributeToSides(totalPlayers: number): { top: number; right: number; bottom: number; left: number } {
    if (totalPlayers === 0) return { top: 0, right: 0, bottom: 0, left: 0 };
    if (totalPlayers === 1) return { top: 0, right: 0, bottom: 1, left: 0 };
    if (totalPlayers === 2) return { top: 1, right: 0, bottom: 1, left: 0 };
    if (totalPlayers === 3) return { top: 1, right: 1, bottom: 1, left: 0 };

    const horizontalCount = totalPlayers - 2;
    const topCount = Math.ceil(horizontalCount / 2);
    const bottomCount = Math.floor(horizontalCount / 2);

    return { top: topCount, right: 1, bottom: bottomCount, left: 1 };
}

function computeTableDimensions(playerCount: number) {
    const sideCounts = distributeToSides(playerCount);
    const maxHorizontal = Math.max(sideCounts.top, sideCounts.bottom, 1);
    const requiredWidth = maxHorizontal * CARD_WIDTH + (maxHorizontal - 1) * CARD_GAP + 200;

    return {
        width: Math.max(500, requiredWidth),
        height: 200,
    };
}

// ============================================================
// COMPONENT
// ============================================================

export const Table: React.FC<TableProps> = ({
    participants, currentRound, areCardsRevealed, isScrumMaster, onReveal, onReset
}) => {
    const myUserId = localStorage.getItem('scrum_poker_user_id');
    const playerCount = participants.length;

    // Subtle parallax state
    const [parallax, setParallax] = useState({ x: 0, y: 0 });

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const offsetX = ((e.clientX - centerX) / rect.width) * -4;
        const offsetY = ((e.clientY - centerY) / rect.height) * -4;

        setParallax({ x: offsetX, y: offsetY });
    }, []);

    const handleMouseLeave = useCallback(() => {
        setParallax({ x: 0, y: 0 });
    }, []);

    const tableDims = useMemo(() => computeTableDimensions(playerCount), [playerCount]);
    const sideCounts = useMemo(() => distributeToSides(playerCount), [playerCount]);

    const seats = useMemo(() => {
        const me = participants.find(p => p.userId === myUserId);
        const others = participants.filter(p => p.userId !== myUserId);

        const result: Seat[] = [];
        let otherIdx = 0;

        if (sideCounts.left > 0 && otherIdx < others.length) {
            result.push({ participant: others[otherIdx++], side: 'left', index: 0, isMe: false });
        }

        if (sideCounts.right > 0 && otherIdx < others.length) {
            result.push({ participant: others[otherIdx++], side: 'right', index: 0, isMe: false });
        }

        for (let i = 0; i < sideCounts.top && otherIdx < others.length; i++) {
            result.push({ participant: others[otherIdx++], side: 'top', index: i, isMe: false });
        }

        const meIndex = Math.floor(sideCounts.bottom / 2);
        for (let i = 0; i < sideCounts.bottom; i++) {
            if (me && i === meIndex) {
                result.push({ participant: me, side: 'bottom', index: i, isMe: true });
            } else if (otherIdx < others.length) {
                result.push({ participant: others[otherIdx++], side: 'bottom', index: i, isMe: false });
            }
        }

        if (me && !result.find(s => s.isMe)) {
            result.push({ participant: me, side: 'bottom', index: 0, isMe: true });
        }

        return result;
    }, [participants, myUserId, sideCounts]);

    const votesCount = participants.filter(p => p.hasVoted).length;
    const allVoted = votesCount === playerCount && playerCount > 0;

    // Card Collection Animation State
    const [isCollecting, setIsCollecting] = useState(false);

    const handleReset = async () => {
        setIsCollecting(true);
        // Wait for collection animation
        await new Promise(resolve => setTimeout(resolve, 600));
        onReset();
        // Brief pause before redistributing
        await new Promise(resolve => setTimeout(resolve, 100));
        setIsCollecting(false);
    };

    const getSeatPosition = (side: 'top' | 'bottom' | 'left' | 'right', index: number, totalOnSide: number) => {
        const NAME_LABEL_HEIGHT = 20; // Height of the name label below the card
        if (side === 'top' || side === 'bottom') {
            const totalWidth = totalOnSide * CARD_WIDTH + (totalOnSide - 1) * CARD_GAP;
            const startOffset = -totalWidth / 2 + CARD_WIDTH / 2;
            const x = startOffset + index * (CARD_WIDTH + CARD_GAP);
            const y = side === 'top'
                ? -(tableDims.height / 2 + TABLE_GAP + CARD_HEIGHT / 2 + NAME_LABEL_HEIGHT)
                : (tableDims.height / 2 + TABLE_GAP + CARD_HEIGHT / 2);
            return { x, y };
        } else {
            const x = side === 'left'
                ? -(tableDims.width / 2 + TABLE_GAP + CARD_WIDTH / 2)
                : (tableDims.width / 2 + TABLE_GAP + CARD_WIDTH / 2);
            return { x, y: 0 };
        }
    };

    return (
        <div
            className="relative flex items-center justify-center"
            style={{
                width: '100%',
                height: '70vh',
                minHeight: '400px',
                background: 'transparent'
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* === TABLE CONTAINER === */}
            <motion.div
                className="relative z-10"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                style={{
                    width: `${tableDims.width}px`,
                    height: `${tableDims.height}px`,
                    transform: `translate(${parallax.x}px, ${parallax.y}px)`,
                }}
            >
                {/* Center Content Container */}
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center p-8"
                >
                    {/* === ENGRAVED TEXT ELEMENT (Subtle Background) === */}
                    <div className="absolute z-0 flex items-center justify-center pointer-events-none select-none opacity-[0.06]">
                        <span
                            className="text-[3.5rem] md:text-[4.5rem] font-semibold tracking-[0.3em] text-center whitespace-nowrap leading-none"
                            style={{
                                color: 'rgba(255, 255, 255, 0.04)',
                                fontFamily: 'Inter, system-ui, sans-serif',
                                // Using shadows to create the engraved/carved feel
                                textShadow: `
                                    -1px -1px 2px rgba(255, 255, 255, 0.08), 
                                    1px 1px 2px rgba(0, 0, 0, 0.35)
                                `
                            }}
                        >
                            SCRUM POKER
                        </span>
                    </div>

                    <motion.div
                        className="relative z-20 flex flex-col items-center gap-1"
                        animate={{ opacity: isCollecting ? 0 : 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <motion.span
                            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                            style={{ color: TABLE_STYLE.textMuted }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            Round {currentRound}
                        </motion.span>

                        <div className="flex items-baseline gap-1">
                            <motion.span
                                className="text-4xl md:text-5xl font-black tracking-tight"
                                style={{ color: TABLE_STYLE.textColor }}
                                key={votesCount}
                                initial={{ scale: 1.2, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 300 }}
                            >
                                {votesCount}
                            </motion.span>
                            <span
                                className="text-lg md:text-xl font-bold"
                                style={{ color: TABLE_STYLE.textMuted }}
                            >
                                / {playerCount}
                            </span>
                        </div>

                        <AnimatePresence mode="wait">
                            {areCardsRevealed ? (
                                isScrumMaster && (
                                    <motion.button
                                        key="next"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        onClick={handleReset}
                                        className="mt-2 px-6 py-2 rounded-xl bg-slate-700 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg hover:bg-slate-600 transition-colors"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        🔄 Next Round
                                    </motion.button>
                                )
                            ) : (
                                isScrumMaster ? (
                                    <motion.button
                                        key="reveal"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        onClick={onReveal}
                                        disabled={!allVoted}
                                        className={`
                                            mt-2 px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-lg transition-all duration-300
                                            ${allVoted
                                                ? 'bg-amber-600 text-white cursor-pointer hover:bg-amber-500'
                                                : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                                            }
                                        `}
                                        whileHover={allVoted ? { scale: 1.05 } : {}}
                                        whileTap={allVoted ? { scale: 0.95 } : {}}
                                    >
                                        {allVoted ? '👁️ Reveal Cards' : `${votesCount}/${participants.length} Voted`}
                                    </motion.button>
                                ) : !allVoted && (
                                    <motion.span
                                        className="mt-2 text-[9px] uppercase tracking-widest"
                                        style={{ color: TABLE_STYLE.textMuted }}
                                        animate={{ opacity: [0.5, 1, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                    >
                                        ⏳ Waiting...
                                    </motion.span>
                                )
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </motion.div>

            {/* === SEATS === */}
            {seats.map((seat, idx) => {
                const totalOnSide = sideCounts[seat.side];
                const pos = getSeatPosition(seat.side, seat.index, totalOnSide);

                return (
                    <motion.div
                        key={seat.participant.socketId}
                        className="absolute z-20"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{
                            opacity: 1,
                            scale: isCollecting ? 0.8 : 1,
                            x: isCollecting ? 0 : pos.x,
                            y: isCollecting ? 0 : pos.y,
                            rotate: isCollecting ? Math.random() * 10 - 5 : 0, // Random pile rotation
                            zIndex: isCollecting ? 50 : 20
                        }}
                        transition={{
                            delay: isCollecting ? idx * 0.05 : idx * 0.05, // Stagger collection and distribution
                            duration: 0.5,
                            ease: [0.34, 1.56, 0.64, 1]
                        }}
                        style={{
                            left: '50%',
                            top: '50%',
                            marginLeft: '-28px',
                            marginTop: '-40px',
                        }}
                    >
                        <motion.div
                            className="flex flex-col items-center"
                            whileHover={{ y: -4 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                            {/* Flip Card Container */}
                            <div
                                className="relative"
                                style={{
                                    width: `${CARD_WIDTH}px`,
                                    height: `${CARD_HEIGHT}px`,
                                    perspective: '800px',
                                }}
                            >
                                <motion.div
                                    className="absolute inset-0"
                                    style={{
                                        transformStyle: 'preserve-3d',
                                    }}
                                    animate={{
                                        rotateY: areCardsRevealed && seat.participant.hasVoted ? 180 : 0
                                    }}
                                    transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                                >
                                    {/* Card Back (Unrevealed State) */}
                                    <div
                                        className={`
                                            absolute inset-0 flex items-center justify-center
                                            rounded-[8px]
                                            ${seat.participant.hasVoted ? '' : 'bg-white/5 border border-white/5'}
                                        `}
                                        style={{
                                            backfaceVisibility: 'hidden',
                                            backgroundColor: seat.participant.hasVoted ? '#2A3142' : undefined,
                                            backgroundImage: seat.participant.hasVoted
                                                ? `
                                                    radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 1px, transparent 1px),
                                                    linear-gradient(135deg, #323A4F 0%, #1F2533 100%)
                                                  `
                                                : undefined,
                                            backgroundSize: '8px 8px, 100% 100%',
                                            boxShadow: seat.participant.hasVoted
                                                ? `
                                                    0 10px 22px rgba(0, 0, 0, 0.45), 
                                                    inset 0 1px 1px rgba(255, 255, 255, 0.06)
                                                  `
                                                : 'none',
                                            border: seat.isMe && seat.participant.hasVoted
                                                ? '1px solid rgba(244, 162, 29, 0.55)'
                                                : 'none',
                                        }}
                                    >
                                    </div>

                                    {/* Card Front (Revealed State - Hero Object) */}
                                    <div
                                        className={`
                                            absolute inset-0 flex items-center justify-center
                                            rounded-[8px]
                                        `}
                                        style={{
                                            backfaceVisibility: 'hidden',
                                            transform: 'rotateY(180deg)',
                                            background: 'linear-gradient(135deg, #FAF9F6 0%, #ECEAE4 100%)',
                                            boxShadow: `
                                                0 16px 34px rgba(0, 0, 0, 0.25),
                                                inset 0 -1px 2px rgba(0, 0, 0, 0.06),
                                                inset 0 1px 1px rgba(255, 255, 255, 0.65)
                                            `,
                                            border: seat.isMe
                                                ? '1px solid rgba(244, 162, 29, 0.55)'
                                                : 'none',
                                        }}
                                    >
                                        {/* Corner Numbers */}
                                        <span className="absolute top-1 left-1.5 text-[10px] font-bold text-[#8C919C]">
                                            {seat.participant.selectedCard}
                                        </span>
                                        <span className="absolute bottom-1 right-1.5 text-[10px] font-bold text-[#8C919C] rotate-180">
                                            {seat.participant.selectedCard}
                                        </span>

                                        {/* Main Number */}
                                        <span
                                            className="font-bold text-3xl tracking-tight text-[#1E2430]"
                                            style={{ textShadow: '0 1px 0 rgba(0, 0, 0, 0.1)' }}
                                        >
                                            {seat.participant.selectedCard}
                                        </span>
                                    </div>
                                </motion.div>
                            </div>

                            <motion.span
                                className={`
                                    mt-1.5 px-2 py-0.5 rounded-lg text-[9px] font-bold truncate max-w-[70px]
                                    ${seat.isMe
                                        ? 'bg-amber-600/90 text-white'
                                        : 'bg-slate-800/50 text-slate-300'
                                    }
                                `}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: isCollecting ? 0 : 1, y: 0 }}
                                transition={{ delay: idx * 0.05 + 0.2 }}
                            >
                                {seat.isMe ? '👤 You' : seat.participant.displayName}
                            </motion.span>
                        </motion.div>
                    </motion.div>
                );
            })}
        </div>
    );
};
