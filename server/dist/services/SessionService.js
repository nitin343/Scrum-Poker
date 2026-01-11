"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionService = void 0;
const InviteSession_1 = require("../models/InviteSession");
const Logger_1 = require("../utils/logger/Logger");
/**
 * SessionService - Handles invite session operations for guest players
 */
class SessionService {
    /**
     * Create a new invite session
     */
    async createSession(data) {
        try {
            // Check for existing active session for this sprint (reconnection/sticky logic)
            const existingSession = await InviteSession_1.InviteSession.findOne({
                sprintId: data.sprintId,
                isActive: true
            }).sort({ createdAt: -1 });
            if (existingSession) {
                // Check if expired
                if (!existingSession.expiresAt || existingSession.expiresAt > new Date()) {
                    Logger_1.logger.info('Returning existing active session for sprint', {
                        sessionId: existingSession.sessionId,
                        sprintId: data.sprintId
                    });
                    return existingSession;
                }
            }
            const expiresAt = data.expiresInHours
                ? new Date(Date.now() + data.expiresInHours * 60 * 60 * 1000)
                : null;
            const session = new InviteSession_1.InviteSession({
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
            Logger_1.logger.info('Invite session created', {
                sessionId: session.sessionId,
                boardId: data.boardId,
                sprintId: data.sprintId,
                createdBy: data.createdBy
            });
            return session;
        }
        catch (error) {
            Logger_1.logger.error('Failed to create invite session', { error: error.message });
            throw error;
        }
    }
    /**
     * Get session by sessionId (for guests joining)
     */
    async getSession(sessionId) {
        try {
            const session = await InviteSession_1.InviteSession.findOne({
                sessionId: sessionId.toUpperCase(),
                isActive: true
            });
            if (!session) {
                return null;
            }
            // Check if expired
            if (session.expiresAt && new Date() > session.expiresAt) {
                Logger_1.logger.info('Session expired', { sessionId });
                return null;
            }
            return session;
        }
        catch (error) {
            Logger_1.logger.error('Failed to get session', { sessionId, error: error.message });
            throw error;
        }
    }
    /**
     * Get all active sessions created by an admin
     */
    async getSessionsByCreator(createdBy) {
        try {
            return await InviteSession_1.InviteSession.find({
                createdBy,
                isActive: true
            }).sort({ createdAt: -1 });
        }
        catch (error) {
            Logger_1.logger.error('Failed to get sessions by creator', { createdBy, error: error.message });
            throw error;
        }
    }
    /**
     * Get sessions for a specific board/sprint combination
     */
    async getSessionsForSprint(boardId, sprintId) {
        try {
            return await InviteSession_1.InviteSession.find({
                boardId,
                sprintId,
                isActive: true
            }).sort({ createdAt: -1 });
        }
        catch (error) {
            Logger_1.logger.error('Failed to get sessions for sprint', { boardId, sprintId, error: error.message });
            throw error;
        }
    }
    /**
     * Deactivate a session (soft delete)
     */
    async deactivateSession(sessionId, userId) {
        try {
            const session = await InviteSession_1.InviteSession.findOne({
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
            Logger_1.logger.info('Session deactivated', { sessionId, userId });
            return true;
        }
        catch (error) {
            Logger_1.logger.error('Failed to deactivate session', { sessionId, error: error.message });
            throw error;
        }
    }
    /**
     * Delete a session permanently
     */
    async deleteSession(sessionId, userId) {
        try {
            const session = await InviteSession_1.InviteSession.findOne({
                sessionId: sessionId.toUpperCase()
            });
            if (!session) {
                return false;
            }
            // Only the creator can delete
            if (session.createdBy !== userId) {
                throw new Error('Not authorized to delete this session');
            }
            await InviteSession_1.InviteSession.deleteOne({ sessionId: sessionId.toUpperCase() });
            Logger_1.logger.info('Session deleted', { sessionId, userId });
            return true;
        }
        catch (error) {
            Logger_1.logger.error('Failed to delete session', { sessionId, error: error.message });
            throw error;
        }
    }
    /**
     * Clean up expired sessions (can be run as a scheduled job)
     */
    async cleanupExpiredSessions() {
        try {
            const result = await InviteSession_1.InviteSession.updateMany({
                expiresAt: { $lt: new Date() },
                isActive: true
            }, { isActive: false });
            if (result.modifiedCount > 0) {
                Logger_1.logger.info('Expired sessions cleaned up', { count: result.modifiedCount });
            }
            return result.modifiedCount;
        }
        catch (error) {
            Logger_1.logger.error('Failed to cleanup expired sessions', { error: error.message });
            throw error;
        }
    }
}
exports.sessionService = new SessionService();
