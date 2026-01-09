import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { Admin } from '../models/Admin';
import jwt from 'jsonwebtoken';

describe('Auth Routes', () => {
    let seedAdmin: any;
    let seedInviteCode: string;

    beforeEach(async () => {
        // Create a seed admin first (simulating the first admin)
        seedAdmin = new Admin({
            email: 'seed@test.com',
            password: 'SecurePass123',
            displayName: 'Seed Admin'
        });
        await seedAdmin.save();
        seedInviteCode = seedAdmin.inviteCode;
    });

    afterEach(async () => {
        await Admin.deleteMany({});
        vi.clearAllMocks();
    });

    // ===========================================
    // SIGNUP TESTS
    // ===========================================
    describe('POST /api/v1/auth/signup', () => {
        it('should fail without invite code', async () => {
            const res = await request(app)
                .post('/api/v1/auth/signup')
                .send({
                    email: 'newuser@test.com',
                    password: 'SecurePass123',
                    displayName: 'New User'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('inviteCode');
        });

        it('should fail with invalid invite code', async () => {
            const res = await request(app)
                .post('/api/v1/auth/signup')
                .send({
                    email: 'newuser@test.com',
                    password: 'SecurePass123',
                    displayName: 'New User',
                    inviteCode: 'INVALID123'
                });

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('Invalid invite code');
        });

        it('should succeed with valid invite code', async () => {
            const res = await request(app)
                .post('/api/v1/auth/signup')
                .send({
                    email: 'newuser@test.com',
                    password: 'SecurePass123',
                    displayName: 'New User',
                    inviteCode: seedInviteCode
                });

            expect(res.status).toBe(201);
            expect(res.body.token).toBeDefined();
            expect(res.body.user.email).toBe('newuser@test.com');
            expect(res.body.user.inviteCode).toBeDefined();
        });

        it('should set invitedBy to the inviter', async () => {
            const res = await request(app)
                .post('/api/v1/auth/signup')
                .send({
                    email: 'invitee@test.com',
                    password: 'SecurePass123',
                    displayName: 'Invited User',
                    inviteCode: seedInviteCode
                });

            expect(res.status).toBe(201);

            // Verify invitedBy is set
            const newUser = await Admin.findOne({ email: 'invitee@test.com' });
            expect(newUser?.invitedBy).toBe(seedAdmin._id.toString());
        });

        it('should inherit companyId from inviter', async () => {
            const res = await request(app)
                .post('/api/v1/auth/signup')
                .send({
                    email: 'newuser@test.com',
                    password: 'SecurePass123',
                    displayName: 'New User',
                    inviteCode: seedInviteCode
                });

            expect(res.status).toBe(201);
            expect(res.body.user.companyId).toBe(seedAdmin.companyId);
        });

        it('should reject weak passwords', async () => {
            const res = await request(app)
                .post('/api/v1/auth/signup')
                .send({
                    email: 'newuser@test.com',
                    password: 'weak',
                    displayName: 'New User',
                    inviteCode: seedInviteCode
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('8 characters');
        });

        it('should reject duplicate emails', async () => {
            const res = await request(app)
                .post('/api/v1/auth/signup')
                .send({
                    email: 'seed@test.com', // Already exists
                    password: 'SecurePass123',
                    displayName: 'Duplicate User',
                    inviteCode: seedInviteCode
                });

            expect(res.status).toBe(409);
            expect(res.body.error).toContain('already registered');
        });
    });

    // ===========================================
    // LOGIN TESTS
    // ===========================================
    describe('POST /api/v1/auth/login', () => {
        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'seed@test.com',
                    password: 'SecurePass123'
                });

            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
            expect(res.body.user.email).toBe('seed@test.com');
            expect(res.body.user.inviteCode).toBeDefined();
        });

        it('should fail with wrong password', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'seed@test.com',
                    password: 'WrongPassword123'
                });

            expect(res.status).toBe(401);
            expect(res.body.error).toContain('Invalid');
        });

        it('should fail with non-existent email', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'SecurePass123'
                });

            expect(res.status).toBe(401);
        });
    });

    // ===========================================
    // VALIDATE INVITE TESTS
    // ===========================================
    describe('POST /api/v1/auth/validate-invite', () => {
        it('should validate a valid invite code', async () => {
            const res = await request(app)
                .post('/api/v1/auth/validate-invite')
                .send({ inviteCode: seedInviteCode });

            expect(res.status).toBe(200);
            expect(res.body.valid).toBe(true);
            expect(res.body.inviterName).toBe('Seed Admin');
        });

        it('should reject invalid invite code', async () => {
            const res = await request(app)
                .post('/api/v1/auth/validate-invite')
                .send({ inviteCode: 'INVALID' });

            expect(res.status).toBe(404);
            expect(res.body.valid).toBe(false);
        });

        it('should require invite code in request', async () => {
            const res = await request(app)
                .post('/api/v1/auth/validate-invite')
                .send({});

            expect(res.status).toBe(400);
        });
    });

    // ===========================================
    // MY INVITE CODE TESTS
    // ===========================================
    describe('GET /api/v1/auth/my-invite-code', () => {
        it('should return user invite code when authenticated', async () => {
            const token = jwt.sign(
                { id: seedAdmin._id, email: seedAdmin.email, companyId: seedAdmin.companyId },
                process.env.JWT_SECRET!,
                { expiresIn: '1h' }
            );

            const res = await request(app)
                .get('/api/v1/auth/my-invite-code')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.inviteCode).toBe(seedInviteCode);
        });

        it('should fail without authentication', async () => {
            const res = await request(app)
                .get('/api/v1/auth/my-invite-code');

            expect(res.status).toBe(401);
        });
    });

    // ===========================================
    // ME ENDPOINT TESTS
    // ===========================================
    describe('GET /api/v1/auth/me', () => {
        it('should return current user info', async () => {
            const token = jwt.sign(
                { id: seedAdmin._id, email: seedAdmin.email, companyId: seedAdmin.companyId },
                process.env.JWT_SECRET!,
                { expiresIn: '1h' }
            );

            const res = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.email).toBe('seed@test.com');
            expect(res.body.inviteCode).toBeDefined();
        });
    });
});
