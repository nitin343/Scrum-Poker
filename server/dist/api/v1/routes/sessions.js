"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SessionService_1 = require("../../../services/SessionService");
const auth_1 = require("../middleware/auth");
const AuthService_1 = require("../../../services/AuthService");
const Logger_1 = require("../../../utils/logger/Logger");
const router = (0, express_1.Router)();
/**
 * POST /api/v1/sessions
 * Create a new invite session for guests
 */
router.post('/', auth_1.authMiddleware, async (req, res) => {
    try {
        Logger_1.logger.info('[API] Creating Session', { body: req.body });
        const userId = req.user.id;
        const { boardId, boardName, sprintId, sprintName, expiresInHours } = req.body;
        // Validation
        if (!boardId || !boardName || !sprintId || !sprintName) {
            return res.status(400).json({
                error: 'boardId, boardName, sprintId, and sprintName are required'
            });
        }
        // Get the creator's info - use JWT companyId as fallback
        const admin = await AuthService_1.authService.getAdminById(userId);
        const companyId = admin?.companyId || req.user.companyId;
        const displayName = admin?.displayName || 'Admin';
        if (!companyId) {
            return res.status(404).json({ error: 'User not found' });
        }
        const session = await SessionService_1.sessionService.createSession({
            boardId,
            boardName,
            sprintId,
            sprintName,
            companyId,
            createdBy: userId,
            createdByName: displayName,
            expiresInHours
        });
        Logger_1.logger.info('Invite session created', { sessionId: session.sessionId, userId });
        res.status(201).json({
            success: true,
            data: {
                sessionId: session.sessionId,
                inviteToken: session.inviteToken,
                boardId: session.boardId,
                boardName: session.boardName,
                sprintId: session.sprintId,
                sprintName: session.sprintName,
                inviteLink: `/room/${session.sessionId}?token=${session.inviteToken}`,
                expiresAt: session.expiresAt,
                createdAt: session.createdAt
            }
        });
    }
    catch (error) {
        Logger_1.logger.error('Create session error', { error: error.message });
        res.status(500).json({ error: error.message || 'Failed to create session' });
    }
});
/**
 * GET /api/v1/sessions/:sessionId
 * Get session details (public - for guest join page)
 * Requires ?token= query param for guest verification
 */
router.get('/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { token } = req.query;
        Logger_1.logger.info('[API] Getting Session', { sessionId, tokenPresent: !!token });
        const session = await SessionService_1.sessionService.getSession(sessionId);
        if (!session) {
            return res.status(404).json({
                error: 'Session not found or expired'
            });
        }
        // Validate invite token for guest access
        if (!token || session.inviteToken !== token) {
            return res.status(403).json({
                error: 'Invalid or missing invite token'
            });
        }
        // Return session details including IDs needed for room join
        res.json({
            success: true,
            data: {
                sessionId: session.sessionId,
                boardId: session.boardId,
                boardName: session.boardName,
                sprintId: session.sprintId,
                sprintName: session.sprintName,
                companyId: session.companyId,
                createdByName: session.createdByName,
                isActive: session.isActive
            }
        });
    }
    catch (error) {
        Logger_1.logger.error('Get session error', { error: error.message });
        res.status(500).json({ error: error.message || 'Failed to get session' });
    }
});
/**
 * GET /api/v1/sessions
 * Get all sessions created by the current user
 */
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const sessions = await SessionService_1.sessionService.getSessionsByCreator(userId);
        res.json({
            success: true,
            data: sessions.map(s => ({
                sessionId: s.sessionId,
                boardId: s.boardId,
                boardName: s.boardName,
                sprintId: s.sprintId,
                sprintName: s.sprintName,
                inviteLink: `/join/${s.sessionId}`,
                expiresAt: s.expiresAt,
                createdAt: s.createdAt,
                isActive: s.isActive
            }))
        });
    }
    catch (error) {
        Logger_1.logger.error('Get sessions error', { error: error.message });
        res.status(500).json({ error: error.message || 'Failed to get sessions' });
    }
});
/**
 * DELETE /api/v1/sessions/:sessionId
 * Delete/deactivate a session
 */
router.delete('/:sessionId', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;
        const deleted = await SessionService_1.sessionService.deleteSession(sessionId, userId);
        if (!deleted) {
            return res.status(404).json({ error: 'Session not found' });
        }
        res.json({ success: true, message: 'Session deleted' });
    }
    catch (error) {
        Logger_1.logger.error('Delete session error', { error: error.message });
        if (error.message === 'Not authorized to delete this session') {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || 'Failed to delete session' });
    }
});
/**
 * PATCH /api/v1/sessions/:sessionId/deactivate
 * Deactivate a session (soft delete)
 */
router.patch('/:sessionId/deactivate', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;
        const deactivated = await SessionService_1.sessionService.deactivateSession(sessionId, userId);
        if (!deactivated) {
            return res.status(404).json({ error: 'Session not found' });
        }
        res.json({ success: true, message: 'Session deactivated' });
    }
    catch (error) {
        Logger_1.logger.error('Deactivate session error', { error: error.message });
        if (error.message === 'Not authorized to deactivate this session') {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || 'Failed to deactivate session' });
    }
});
exports.default = router;
