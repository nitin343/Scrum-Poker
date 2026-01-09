import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
    id: string;
    email: string;
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
        const secret = process.env.JWT_SECRET || 'fallback-secret';

        const decoded = jwt.verify(token, secret) as JwtPayload;
        (req as any).user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
