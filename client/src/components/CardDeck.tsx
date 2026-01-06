import React from 'react';

const FIBONACCI = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, '?', '☕'];

interface CardDeckProps {
    selectedValue?: string | number | null;
    onSelect: (value: string | number) => void;
    disabled?: boolean;
}

export const CardDeck: React.FC<CardDeckProps> = ({ selectedValue, onSelect, disabled }) => {
    return (
        <div className="flex justify-center gap-2 md:gap-3 flex-wrap pb-safe">
            {FIBONACCI.map((value) => {
                const isSelected = selectedValue === value;
                return (
                    <button
                        key={value}
                        disabled={disabled}
                        onClick={() => onSelect(value)}
                        className={`
                            relative w-12 h-16 md:w-16 md:h-24 rounded-lg md:rounded-xl 
                            border-2 font-bold text-lg md:text-2xl transition-all duration-300
                            flex items-center justify-center outline-none select-none
                            ${disabled
                                ? 'opacity-40 cursor-not-allowed scale-95 grayscale'
                                : 'cursor-pointer hover:-translate-y-2 hover:shadow-xl active:scale-95'
                            }
                            ${isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/40 -translate-y-2 ring-4 ring-indigo-500/10'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'
                            }
                        `}
                    >
                        {/* Card Pattern for visual texture */}
                        {!isSelected && <div className="absolute inset-2 border border-gray-100 rounded opacity-50 pointer-events-none"></div>}

                        <span className="relative z-10 transform transition-transform duration-300">
                            {value}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};
