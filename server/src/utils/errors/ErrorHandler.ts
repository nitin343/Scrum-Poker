import type { Response } from 'express';
import { AppError } from './AppError';

export interface ErrorResponse {
    success: false;
    error: {
        type: string;
        message: string;
        statusCode: number;
        details?: any;
        timestamp: string;
    };
}

export const handleError = (error: unknown, res: Response): void => {
    const timestamp = new Date().toISOString();

    if (error instanceof AppError) {
        const response: ErrorResponse = {
            success: false,
            error: {
                type: error.constructor.name,
                message: error.message,
                statusCode: error.statusCode,
                timestamp
            }
        };
        res.status(error.statusCode).json(response);
    } else if (error instanceof Error) {
        const response: ErrorResponse = {
            success: false,
            error: {
                type: 'InternalError',
                message: process.env.NODE_ENV === 'production' 
                    ? 'An unexpected error occurred'
                    : error.message,
                statusCode: 500,
                timestamp
            }
        };
        res.status(500).json(response);
    } else {
        res.status(500).json({
            success: false,
            error: {
                type: 'UnknownError',
                message: 'An unexpected error occurred',
                statusCode: 500,
                timestamp
            }
        });
    }
};

export const asyncHandler = (fn: Function) => 
    (...args: any[]) => Promise.resolve(fn(...args)).catch(args[args.length - 1]);
