import { InviteSession, IInviteSession } from '../models/InviteSession';
import { logger } from '../utils/logger/Logger';

/**
 * SessionService - Handles invite session operations for guest players
 */
class SessionService {
    /**
     * Create a new invite session
     */
    public async createSession(data: {
        boardId: string;
        boardName: string;
        sprintId: string;
        sprintName: string;
        companyId: string;
        createdBy: string;
        createdByName: string;
        expiresInHours?: number;
    }): Promise<IInviteSession> {
        try {
            // Check for existing active session for this sprint (reconnection/sticky logic)
            const existingSession = await InviteSession.findOne({
                sprintId: data.sprintId,
                isActive: true
            }).sort({ createdAt: -1 });

            if (existingSession) {
                // Check if expired
                if (!existingSession.expiresAt || existingSession.expiresAt > new Date()) {
                    logger.info('Returning existing active session for sprint', {
                        sessionId: existingSession.sessionId,
                        sprintId: data.sprintId
                    });
                    return existingSession;
                }
            }

            const expiresAt = data.expiresInHours
                ? new Date(Date.now() + data.expiresInHours * 60 * 60 * 1000)
                : null;

            const session = new InviteSession({
                boardId: data.boardId,
                boardName: data.boardName,
                sprintId: data.sprintId,
                sprintName: data.sprintName,
                companyId: data.companyId,
                createdBy: data.createdBy,
                createdByName: data.createdByName,
                expiresAt,
                isActive: true
            });

            await session.save();
            logger.info('Invite session created', {
                sessionId: session.sessionId,
                boardId: data.boardId,
                sprintId: data.sprintId,
                createdBy: data.createdBy
            });

            return session;
        } catch (error: any) {
            logger.error('Failed to create invite session', { error: error.message });
            throw error;
        }
    }

    /**
     * Get session by sessionId (for guests joining)
     */
    public async getSession(sessionId: string): Promise<IInviteSession | null> {
        try {
            const session = await InviteSession.findOne({
                sessionId: sessionId.toUpperCase(),
                isActive: true
            });

            if (!session) {
                return null;
            }

            // Check if expired
            if (session.expiresAt && new Date() > session.expiresAt) {
                logger.info('Session expired', { sessionId });
                return null;
            }

            return session;
        } catch (error: any) {
            logger.error('Failed to get session', { sessionId, error: error.message });
            throw error;
        }
    }

    /**
     * Get all active sessions created by an admin
     */
    public async getSessionsByCreator(createdBy: string): Promise<IInviteSession[]> {
        try {
            return await InviteSession.find({
                createdBy,
                isActive: true
            }).sort({ createdAt: -1 });
        } catch (error: any) {
            logger.error('Failed to get sessions by creator', { createdBy, error: error.message });
            throw error;
        }
    }

    /**
     * Get sessions for a specific board/sprint combination
     */
    public async getSessionsForSprint(boardId: string, sprintId: string): Promise<IInviteSession[]> {
        try {
            return await InviteSession.find({
                boardId,
                sprintId,
                isActive: true
            }).sort({ createdAt: -1 });
        } catch (error: any) {
            logger.error('Failed to get sessions for sprint', { boardId, sprintId, error: error.message });
            throw error;
        }
    }

    /**
     * Deactivate a session (soft delete)
     */
    public async deactivateSession(sessionId: string, userId: string): Promise<boolean> {
        try {
            const session = await InviteSession.findOne({
                sessionId: sessionId.toUpperCase()
            });

            if (!session) {
                return false;
            }

            // Only the creator can deactivate
            if (session.createdBy !== userId) {
                throw new Error('Not authorized to deactivate this session');
            }

            session.isActive = false;
            await session.save();

            logger.info('Session deactivated', { sessionId, userId });
            return true;
        } catch (error: any) {
            logger.error('Failed to deactivate session', { sessionId, error: error.message });
            throw error;
        }
    }

    /**
     * Delete a session permanently
     */
    public async deleteSession(sessionId: string, userId: string): Promise<boolean> {
        try {
            const session = await InviteSession.findOne({
                sessionId: sessionId.toUpperCase()
            });

            if (!session) {
                return false;
            }

            // Only the creator can delete
            if (session.createdBy !== userId) {
                throw new Error('Not authorized to delete this session');
            }

            await InviteSession.deleteOne({ sessionId: sessionId.toUpperCase() });
            logger.info('Session deleted', { sessionId, userId });
            return true;
        } catch (error: any) {
            logger.error('Failed to delete session', { sessionId, error: error.message });
            throw error;
        }
    }

    /**
     * Clean up expired sessions (can be run as a scheduled job)
     */
    public async cleanupExpiredSessions(): Promise<number> {
        try {
            const result = await InviteSession.updateMany(
                {
                    expiresAt: { $lt: new Date() },
                    isActive: true
                },
                { isActive: false }
            );

            if (result.modifiedCount > 0) {
                logger.info('Expired sessions cleaned up', { count: result.modifiedCount });
            }

            return result.modifiedCount;
        } catch (error: any) {
            logger.error('Failed to cleanup expired sessions', { error: error.message });
            throw error;
        }
    }
}

export const sessionService = new SessionService();
