"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const Admin_1 = require("../models/Admin");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Logger_1 = require("../utils/logger/Logger");
/**
 * AuthService - Handles authentication operations
 */
class AuthService {
    /**
     * Get JWT secret with proper validation
     * SECURITY: Throws error in production if JWT_SECRET not set
     */
    getJwtSecret() {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            if (process.env.NODE_ENV === 'production') {
                throw new Error('JWT_SECRET environment variable is required in production');
            }
            Logger_1.logger.warn('JWT_SECRET not set - using insecure fallback for development only');
            return 'dev-only-insecure-secret-do-not-use-in-production';
        }
        return secret;
    }
    /**
     * Generate JWT token
     */
    generateToken(payload, expiresIn = '7d') {
        const secret = this.getJwtSecret();
        return jsonwebtoken_1.default.sign(payload, secret, { expiresIn });
    }
    /**
     * Verify JWT token
     */
    verifyToken(token) {
        try {
            const secret = this.getJwtSecret();
            return jsonwebtoken_1.default.verify(token, secret);
        }
        catch (error) {
            Logger_1.logger.error('Token verification failed', { error });
            return null;
        }
    }
    /**
     * Validate invite code - check if it exists and belongs to an admin
     * Returns the inviter's info if valid
     */
    async validateInviteCode(inviteCode) {
        try {
            const inviter = await Admin_1.Admin.findOne({ inviteCode: inviteCode.toUpperCase() });
            if (!inviter) {
                return { valid: false };
            }
            return {
                valid: true,
                inviterName: inviter.displayName,
                companyId: inviter.companyId
            };
        }
        catch (error) {
            Logger_1.logger.error('Invite code validation failed', { error: error.message });
            return { valid: false };
        }
    }
    /**
     * Register new admin user with invite code validation
     */
    async signup(email, password, displayName, inviteCode, companyId) {
        // Validate invite code first
        const inviteValidation = await this.validateInviteCode(inviteCode);
        if (!inviteValidation.valid) {
            throw new Error('Invalid invite code');
        }
        // Find the inviter to set invitedBy and inherit companyId if not provided
        const inviter = await Admin_1.Admin.findOne({ inviteCode: inviteCode.toUpperCase() });
        if (!inviter) {
            throw new Error('Invalid invite code');
        }
        // Check if email already exists
        const existingAdmin = await Admin_1.Admin.findOne({ email: email.toLowerCase() });
        if (existingAdmin) {
            throw new Error('Email already registered');
        }
        // Create the new admin (inviteCode will be auto-generated)
        const admin = new Admin_1.Admin({
            email: email.toLowerCase(),
            password,
            displayName,
            companyId: companyId || inviter.companyId, // Inherit from inviter if not specified
            invitedBy: inviter._id.toString()
        });
        await admin.save();
        Logger_1.logger.info('Admin created via invite', {
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
    async createSeedAdmin(email, password, displayName, companyId = 'siemens') {
        const existingAdmin = await Admin_1.Admin.findOne({ email: email.toLowerCase() });
        if (existingAdmin) {
            throw new Error('Email already registered');
        }
        const admin = new Admin_1.Admin({
            email: email.toLowerCase(),
            password,
            displayName,
            companyId
        });
        await admin.save();
        Logger_1.logger.info('Seed admin created', { odId: admin._id, email: admin.email, inviteCode: admin.inviteCode });
        return admin;
    }
    /**
     * Login admin user
     */
    async login(email, password) {
        const admin = await Admin_1.Admin.findOne({ email: email.toLowerCase() });
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
    async getAdminById(id) {
        return Admin_1.Admin.findById(id);
    }
    /**
     * Get admin's invite code
     */
    async getInviteCode(odId) {
        const admin = await Admin_1.Admin.findById(odId);
        return admin?.inviteCode || null;
    }
    /**
     * Update admin's selected board
     */
    async updateSelectedBoard(odId, boardId) {
        return Admin_1.Admin.findByIdAndUpdate(odId, { selectedBoardId: boardId }, { new: true });
    }
}
exports.authService = new AuthService();
