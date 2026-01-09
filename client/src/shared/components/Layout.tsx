import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
    children: ReactNode;
    className?: string;
}

export const Layout = ({ children, className = '' }: LayoutProps) => (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black ${className}`}>
        <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="container mx-auto px-4 py-8"
        >
            {children}
        </motion.main>
    </div>
);

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="bg-slate-800 rounded-lg p-6 max-w-md w-full"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                >
                    {title && <h2 className="text-xl font-bold mb-4 text-white">{title}</h2>}
                    {children}
                    <button
                        onClick={onClose}
                        className="mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
                    >
                        Close
                    </button>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);
