import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', isLoading, children, ...props }) => {
    const variantStyles = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white',
        secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
        danger: 'bg-red-600 hover:bg-red-700 text-white'
    };

    const sizeStyles = {
        sm: 'px-3 py-1 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg'
    };

    return (
        <motion.button
            className={`rounded font-semibold transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading || props.disabled}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            {...(props as any)}
        >
            {isLoading ? '...' : children}
        </motion.button>
    );
};

Button.displayName = 'Button';
