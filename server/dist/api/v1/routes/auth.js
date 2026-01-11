"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthService_1 = require("../../../services/AuthService");
const auth_1 = require("../middleware/auth");
const Logger_1 = require("../../../utils/logger/Logger");
const router = (0, express_1.Router)();
/**
 * POST /api/v1/auth/validate-invite
 * Validate an invite code before signup
 */
router.post('/validate-invite', async (req, res) => {
    try {
        const { inviteCode } = req.body;
        if (!inviteCode) {
            return res.status(400).json({ error: 'Invite code is required' });
        }
        const result = await AuthService_1.authService.validateInviteCode(inviteCode);
        if (!result.valid) {
            return res.status(404).json({ valid: false, error: 'Invalid invite code' });
        }
        res.json({
            valid: true,
            inviterName: result.inviterName,
            companyId: result.companyId
        });
    }
    catch (error) {
        Logger_1.logger.error('Validate invite error', { error: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});
/**
 * POST /api/v1/auth/signup
 * Register a new admin user with invite code
 */
router.post('/signup', async (req, res) => {
    try {
        const { email, password, displayName, inviteCode, companyId } = req.body;
        // Validation
        if (!email || !password || !displayName || !inviteCode) {
            Logger_1.logger.warn('Signup attempt with missing fields', { email });
            return res.status(400).json({ error: 'Email, password, displayName, and inviteCode are required' });
        }
        if (password.length < 8) {
            Logger_1.logger.warn('Signup attempt with weak password', { email });
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        // Create user via service (inviteCode validation happens inside)
        const admin = await AuthService_1.authService.signup(email, password, displayName, inviteCode, companyId);
        // Generate token
        const token = AuthService_1.authService.generateToken({
            id: admin._id.toString(),
            email: admin.email,
            companyId: admin.companyId
        });
        Logger_1.logger.info('User signed up', { userId: admin._id, email: admin.email });
        res.status(201).json({
            token,
            user: {
                id: admin._id,
                email: admin.email,
                displayName: admin.displayName,
                companyId: admin.companyId,
                inviteCode: admin.inviteCode
            }
        });
    }
    catch (error) {
        Logger_1.logger.error('Signup error', { error: error.message });
        // Handle specific errors
        if (error.message === 'Invalid invite code') {
            return res.status(403).json({ error: 'Invalid invite code' });
        }
        if (error.message === 'Email already registered') {
            return res.status(409).json({ error: 'Email already registered' });
        }
        res.status(400).json({ error: error.message || 'Server error during signup' });
    }
});
/**
 * POST /api/v1/auth/seed
 * Create the first seed admin (for initial setup only)
 * This should be disabled in production or protected
 */
router.post('/seed', async (req, res) => {
    try {
        const { email, password, displayName, companyId } = req.body;
        if (!email || !password || !displayName) {
            return res.status(400).json({ error: 'Email, password, and displayName are required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        const admin = await AuthService_1.authService.createSeedAdmin(email, password, displayName, companyId);
        const token = AuthService_1.authService.generateToken({
            id: admin._id.toString(),
            email: admin.email,
            companyId: admin.companyId
        });
        Logger_1.logger.info('Seed admin created', { userId: admin._id, email: admin.email, inviteCode: admin.inviteCode });
        res.status(201).json({
            token,
            user: {
                id: admin._id,
                email: admin.email,
                displayName: admin.displayName,
                companyId: admin.companyId,
                inviteCode: admin.inviteCode
            },
            message: 'Seed admin created - use this invite code to invite others'
        });
    }
    catch (error) {
        Logger_1.logger.error('Seed admin error', { error: error.message });
        res.status(400).json({ error: error.message || 'Server error' });
    }
});
/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validation
        if (!email || !password) {
            Logger_1.logger.warn('Login attempt with missing fields', { email });
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Login via service
        const admin = await AuthService_1.authService.login(email, password);
        // Generate token
        const token = AuthService_1.authService.generateToken({
            id: admin._id.toString(),
            email: admin.email,
            companyId: admin.companyId
        });
        Logger_1.logger.info('User logged in', { userId: admin._id, email: admin.email });
        res.json({
            token,
            user: {
                id: admin._id,
                email: admin.email,
                displayName: admin.displayName,
                companyId: admin.companyId,
                inviteCode: admin.inviteCode,
                selectedBoardId: admin.selectedBoardId
            }
        });
    }
    catch (error) {
        Logger_1.logger.error('Login error', { error: error.message });
        res.status(401).json({ error: error.message || 'Invalid credentials' });
    }
});
/**
 * GET /api/v1/auth/me
 * Get current authenticated user
 */
router.get('/me', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const admin = await AuthService_1.authService.getAdminById(userId);
        if (!admin) {
            Logger_1.logger.warn('User not found', { userId });
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            id: admin._id,
            email: admin.email,
            displayName: admin.displayName,
            companyId: admin.companyId,
            inviteCode: admin.inviteCode,
            selectedBoardId: admin.selectedBoardId
        });
    }
    catch (error) {
        Logger_1.logger.error('Get user error', { error: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});
/**
 * GET /api/v1/auth/my-invite-code
 * Get the logged-in user's invite code
 */
router.get('/my-invite-code', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const inviteCode = await AuthService_1.authService.getInviteCode(userId);
        if (!inviteCode) {
            return res.status(404).json({ error: 'Invite code not found' });
        }
        res.json({ inviteCode });
    }
    catch (error) {
        Logger_1.logger.error('Get invite code error', { error: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});
/**
 * PATCH /api/v1/auth/selected-board
 * Update the user's last selected board
 */
router.patch('/selected-board', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { boardId } = req.body;
        if (!boardId) {
            return res.status(400).json({ error: 'Board ID is required' });
        }
        const admin = await AuthService_1.authService.updateSelectedBoard(userId, boardId);
        if (!admin) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            message: 'Selected board updated',
            selectedBoardId: admin.selectedBoardId
        });
    }
    catch (error) {
        Logger_1.logger.error('Update selected board error', { error: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
