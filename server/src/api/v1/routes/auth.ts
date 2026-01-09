import { Router, Request, Response } from 'express';
import { authService } from '../../../services/AuthService';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../../../utils/logger/Logger';

const router = Router();

/**
 * POST /api/v1/auth/validate-invite
 * Validate an invite code before signup
 */
router.post('/validate-invite', async (req: Request, res: Response) => {
    try {
        const { inviteCode } = req.body;

        if (!inviteCode) {
            return res.status(400).json({ error: 'Invite code is required' });
        }

        const result = await authService.validateInviteCode(inviteCode);

        if (!result.valid) {
            return res.status(404).json({ valid: false, error: 'Invalid invite code' });
        }

        res.json({
            valid: true,
            inviterName: result.inviterName,
            companyId: result.companyId
        });
    } catch (error: any) {
        logger.error('Validate invite error', { error: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/v1/auth/signup
 * Register a new admin user with invite code
 */
router.post('/signup', async (req: Request, res: Response) => {
    try {
        const { email, password, displayName, inviteCode, companyId } = req.body;

        // Validation
        if (!email || !password || !displayName || !inviteCode) {
            logger.warn('Signup attempt with missing fields', { email });
            return res.status(400).json({ error: 'Email, password, displayName, and inviteCode are required' });
        }

        if (password.length < 8) {
            logger.warn('Signup attempt with weak password', { email });
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Create user via service (inviteCode validation happens inside)
        const admin = await authService.signup(email, password, displayName, inviteCode, companyId);

        // Generate token
        const token = authService.generateToken({
            id: admin._id.toString(),
            email: admin.email,
            companyId: admin.companyId
        });

        logger.info('User signed up', { userId: admin._id, email: admin.email });

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
    } catch (error: any) {
        logger.error('Signup error', { error: error.message });

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
router.post('/seed', async (req: Request, res: Response) => {
    try {
        const { email, password, displayName, companyId } = req.body;

        if (!email || !password || !displayName) {
            return res.status(400).json({ error: 'Email, password, and displayName are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const admin = await authService.createSeedAdmin(email, password, displayName, companyId);

        const token = authService.generateToken({
            id: admin._id.toString(),
            email: admin.email,
            companyId: admin.companyId
        });

        logger.info('Seed admin created', { userId: admin._id, email: admin.email, inviteCode: admin.inviteCode });

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
    } catch (error: any) {
        logger.error('Seed admin error', { error: error.message });
        res.status(400).json({ error: error.message || 'Server error' });
    }
});

/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            logger.warn('Login attempt with missing fields', { email });
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Login via service
        const admin = await authService.login(email, password);

        // Generate token
        const token = authService.generateToken({
            id: admin._id.toString(),
            email: admin.email,
            companyId: admin.companyId
        });

        logger.info('User logged in', { userId: admin._id, email: admin.email });

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
    } catch (error: any) {
        logger.error('Login error', { error: error.message });
        res.status(401).json({ error: error.message || 'Invalid credentials' });
    }
});

/**
 * GET /api/v1/auth/me
 * Get current authenticated user
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const admin = await authService.getAdminById(userId);

        if (!admin) {
            logger.warn('User not found', { userId });
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
    } catch (error: any) {
        logger.error('Get user error', { error: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/v1/auth/my-invite-code
 * Get the logged-in user's invite code
 */
router.get('/my-invite-code', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const inviteCode = await authService.getInviteCode(userId);

        if (!inviteCode) {
            return res.status(404).json({ error: 'Invite code not found' });
        }

        res.json({ inviteCode });
    } catch (error: any) {
        logger.error('Get invite code error', { error: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PATCH /api/v1/auth/selected-board
 * Update the user's last selected board
 */
router.patch('/selected-board', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { boardId } = req.body;

        if (!boardId) {
            return res.status(400).json({ error: 'Board ID is required' });
        }

        const admin = await authService.updateSelectedBoard(userId, boardId);

        if (!admin) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'Selected board updated',
            selectedBoardId: admin.selectedBoardId
        });
    } catch (error: any) {
        logger.error('Update selected board error', { error: error.message });
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
