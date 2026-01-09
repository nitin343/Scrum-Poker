import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../../../utils/logger/Logger';

interface JwtPayload {
    id: string;
    email: string;
    companyId: string;
}

/**
 * Get JWT secret with proper validation
 * SECURITY: Logs warning but allows dev fallback for testing
 */
function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('JWT_SECRET environment variable is required in production');
        }
        // Allow insecure fallback only in development/test
        return 'dev-only-insecure-secret-do-not-use-in-production';
    }
    return secret;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({ error: 'Invalid token format' });
        }

        const token = parts[1];
        const secret = getJwtSecret();

        const decoded = jwt.verify(token, secret) as JwtPayload;
        (req as any).user = decoded;

        next();
    } catch (error) {
        logger.warn('Auth middleware: Invalid or expired token');
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
