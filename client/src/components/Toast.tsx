import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    const getColors = () => {
        switch (type) {
            case 'success':
                return 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400';
            case 'error':
                return 'bg-red-500/10 border-red-500/50 text-red-400';
            default:
                return 'bg-blue-500/10 border-blue-500/50 text-blue-400';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            default: return 'ℹ️';
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-6 py-3 rounded-xl border backdrop-blur-md shadow-xl ${getColors()}`}
                >
                    <span className="text-lg">{getIcon()}</span>
                    <span className="font-medium">{message}</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
