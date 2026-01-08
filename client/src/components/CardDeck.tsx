import React from 'react';
import { motion } from 'framer-motion';

const FIBONACCI = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, '?', '☕'];

interface CardDeckProps {
    selectedValue?: string | number | null;
    onSelect: (value: string | number) => void;
    disabled?: boolean;
}

const cardVariants = {
    initial: { scale: 0.8, opacity: 0, y: 20 },
    animate: {
        scale: 1,
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: 'easeOut' as const
        }
    },
    hover: {
        y: -8,
        scale: 1.05,
        transition: { duration: 0.2, ease: 'easeOut' as const }
    },
    tap: { scale: 0.95 },
    selected: {
        y: -12,
        scale: 1.1,
        opacity: 1,
        transition: { duration: 0.2, ease: 'easeOut' as const }
    }
};

export const CardDeck: React.FC<CardDeckProps> = ({ selectedValue, onSelect, disabled }) => {
    return (
        <div className="flex justify-center gap-2 md:gap-3 flex-wrap pb-safe">
            {FIBONACCI.map((value, index) => {
                const isSelected = selectedValue === value;
                return (
                    <motion.button
                        key={value}
                        disabled={disabled}
                        onClick={() => onSelect(value)}
                        variants={cardVariants}
                        initial="initial"
                        animate={isSelected ? "selected" : "animate"}
                        whileHover={!disabled ? "hover" : {}}
                        whileTap={!disabled ? "tap" : {}}
                        custom={index}
                        className={`
                            relative w-11 h-16 md:w-14 md:h-20 rounded-xl
                            font-bold text-lg md:text-xl transition-all duration-200
                            flex items-center justify-center outline-none select-none
                            ${disabled
                                ? 'opacity-40 cursor-not-allowed grayscale'
                                : 'cursor-pointer'
                            }
                            ${isSelected
                                ? 'bg-[#1B2838] border-2 border-purple-500 text-white'
                                : 'bg-[#1B2838] border border-white/20 text-white hover:border-purple-500/50'
                            }
                        `}
                        style={{
                            boxShadow: isSelected
                                ? '0 4px 15px rgba(124, 58, 237, 0.3), inset 0 0 0 1px rgba(124, 58, 237, 0.2)'
                                : '0 4px 12px rgba(0, 0, 0, 0.25)'
                        }}
                    >
                        {/* Inner card texture */}
                        {!isSelected && (
                            <div className="absolute inset-1.5 border border-white/10 rounded-lg pointer-events-none" />
                        )}

                        <span className="relative z-10 font-black">{value}</span>

                        {/* Selection indicator */}
                        {isSelected && (
                            <motion.div
                                className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-[10px] text-white border-2 border-[#0f0f1a]"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 500 }}
                            >
                                ✓
                            </motion.div>
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
};
