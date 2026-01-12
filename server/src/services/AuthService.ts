import { Admin } from '../models/Admin';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger/Logger';

export interface LoginPayload {
    id: string;
    email: string;
    companyId: string;
}

/**
 * AuthService - Handles authentication operations
 */
class AuthService {
    /**
     * Get JWT secret with proper validation
     * SECURITY: Throws error in production if JWT_SECRET not set
     */
    private getJwtSecret(): string {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            if (process.env.NODE_ENV === 'production') {
                throw new Error('JWT_SECRET environment variable is required in production');
            }
            logger.warn('JWT_SECRET not set - using insecure fallback for development only');
            return 'dev-only-insecure-secret-do-not-use-in-production';
        }
        return secret;
    }

    /**
     * Generate JWT token
     */
    public generateToken(payload: LoginPayload, expiresIn: string = '7d'): string {
        const secret = this.getJwtSecret();
        return (jwt.sign as any)(payload, secret, { expiresIn });
    }

    /**
     * Verify JWT token
     */
    public verifyToken(token: string): LoginPayload | null {
        try {
            const secret = this.getJwtSecret();
            return jwt.verify(token, secret) as LoginPayload;
        } catch (error) {
            logger.error('Token verification failed', { error });
            return null;
        }
    }

    /**
     * Validate invite code - check if it exists and belongs to an admin
     * Returns the inviter's info if valid
     */
    public async validateInviteCode(inviteCode: string): Promise<{ valid: boolean; inviterName?: string; companyId?: string }> {
        try {
            const inviter = await Admin.findOne({ inviteCode: inviteCode.toUpperCase() });

            if (!inviter) {
                logger.warn(`Invite code not found: ${inviteCode}`);
                return { valid: false };
            }

            return {
                valid: true,
                inviterName: inviter.displayName,
                companyId: inviter.companyId
            };
        } catch (error: any) {
            logger.error('Invite code validation failed', { error: error.message });
            return { valid: false };
        }
    }

    /**
     * Register new admin user with invite code validation
     */
    public async signup(
        email: string,
        password: string,
        displayName: string,
        inviteCode: string,
        companyId?: string
    ) {
        // Validate invite code first
        const inviteValidation = await this.validateInviteCode(inviteCode);
        if (!inviteValidation.valid) {
            logger.warn(`Signup failed: Invalid invite code ${inviteCode}`);
            throw new Error('Invalid invite code');
        }

        // Find the inviter to set invitedBy and inherit companyId if not provided
        const inviter = await Admin.findOne({ inviteCode: inviteCode.toUpperCase() });
        if (!inviter) {
            throw new Error('Invalid invite code');
        }

        // Check if email already exists
        const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
        if (existingAdmin) {
            throw new Error('Email already registered');
        }

        // Create the new admin (inviteCode will be auto-generated)
        const admin = new Admin({
            email: email.toLowerCase(),
            password,
            displayName,
            companyId: companyId || inviter.companyId, // Inherit from inviter if not specified
            invitedBy: inviter._id.toString()
        });

        await admin.save();
        logger.info('Admin created via invite', {
            odId: admin._id,
            email: admin.email,
            invitedBy: inviter.email
        });

        return admin;
    }

    /**
     * Create the first admin (seed admin - no invite code required)
     * This should only be used for initial setup
     */
    public async createSeedAdmin(email: string, password: string, displayName: string, companyId: string = 'siemens') {
        const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
        if (existingAdmin) {
            throw new Error('Email already registered');
        }

        const admin = new Admin({
            email: email.toLowerCase(),
            password,
            displayName,
            companyId
        });

        await admin.save();
        logger.info('Seed admin created', { odId: admin._id, email: admin.email, inviteCode: admin.inviteCode });
        return admin;
    }

    /**
     * Login admin user
     */
    public async login(email: string, password: string) {
        const admin = await Admin.findOne({ email: email.toLowerCase() });
        if (!admin) {
            throw new Error('Invalid email or password');
        }

        const isPasswordValid = await admin.comparePassword(password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        return admin;
    }

    /**
     * Get admin by ID
     */
    public async getAdminById(id: string) {
        return Admin.findById(id);
    }

    /**
     * Get admin's invite code
     */
    public async getInviteCode(odId: string): Promise<string | null> {
        const admin = await Admin.findById(odId);
        return admin?.inviteCode || null;
    }

    /**
     * Update admin's selected board
     */
    public async updateSelectedBoard(odId: string, boardId: string) {
        return Admin.findByIdAndUpdate(odId, { selectedBoardId: boardId }, { new: true });
    }
}

export const authService = new AuthService();
