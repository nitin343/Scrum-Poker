import type { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../utils/errors/AppError';
import { handleError } from '../utils/errors/ErrorHandler';
import { logger } from '../utils/logger/Logger';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    logger.error('Error caught by error handler', err);

    if (err instanceof AppError) {
        handleError(err, res);
    } else if (err instanceof SyntaxError) {
        const validationError = new AppError(
            'Invalid JSON',
            ErrorCodes.INVALID_INPUT
        );
        handleError(validationError, res);
    } else {
        const internalError = new AppError(
            process.env.NODE_ENV === 'production' 
                ? 'Internal Server Error'
                : err.message,
            ErrorCodes.INTERNAL_SERVER_ERROR
        );
        handleError(internalError, res);
    }
};

export const notFoundHandler = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const error = new AppError(
        `Route not found: ${req.method} ${req.path}`,
        ErrorCodes.NOT_FOUND
    );
    handleError(error, res);
};

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
    (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
