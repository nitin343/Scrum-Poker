import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../app';
import { Admin } from '../models/Admin';
import { InviteSession } from '../models/InviteSession';
import jwt from 'jsonwebtoken';

describe('Session Routes', () => {
    let admin: any;
    let authToken: string;

    // Ensure DB connection for Integration Tests
    beforeAll(async () => {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/scrum-poker-test-sessions';
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(mongoUri);
        }
    });

    afterAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
    });

    beforeEach(async () => {
        admin = new Admin({
            email: 'sessiontest@test.com',
            password: 'SecurePass123',
            displayName: 'Session Test Admin'
        });
        await admin.save();

        authToken = jwt.sign(
            { id: admin._id, email: admin.email, companyId: admin.companyId },
            process.env.JWT_SECRET!,
            { expiresIn: '1h' }
        );
    });

    afterEach(async () => {
        await Admin.deleteMany({});
        await InviteSession.deleteMany({});
        vi.clearAllMocks();
    });

    // ===========================================
    // CREATE SESSION TESTS
    // ===========================================
    describe('POST /api/v1/sessions', () => {
        it('should create a new invite session', async () => {
            const res = await request(app)
                .post('/api/v1/sessions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    boardId: '123',
                    boardName: 'Test Board',
                    sprintId: '456',
                    sprintName: 'Sprint 1'
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.sessionId).toBeDefined();
            expect(res.body.data.inviteLink).toContain('/room/');
        });

        it('should fail without required fields', async () => {
            const res = await request(app)
                .post('/api/v1/sessions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    boardId: '123'
                    // Missing other required fields
                });

            expect(res.status).toBe(400);
        });

        it('should fail without authentication', async () => {
            const res = await request(app)
                .post('/api/v1/sessions')
                .send({
                    boardId: '123',
                    boardName: 'Test Board',
                    sprintId: '456',
                    sprintName: 'Sprint 1'
                });

            expect(res.status).toBe(401);
        });
    });

    // ===========================================
    // GET SESSION TESTS (Public)
    // ===========================================
    describe('GET /api/v1/sessions/:sessionId', () => {
        it('should return session info for guests', async () => {
            // First create a session
            const session = new InviteSession({
                boardId: '123',
                boardName: 'Test Board',
                sprintId: '456',
                sprintName: 'Sprint 1',
                companyId: admin.companyId,
                createdBy: admin._id.toString(),
                createdByName: admin.displayName
            });
            await session.save();

            const res = await request(app)
                .get(`/api/v1/sessions/${session.sessionId}?token=${session.inviteToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.boardName).toBe('Test Board');
            expect(res.body.data.sprintName).toBe('Sprint 1');
            // IDs are needed for room join
            expect(res.body.data.boardId).toBe('123');
            expect(res.body.data.sprintId).toBe('456');
        });

        it('should return 404 for non-existent session', async () => {
            const res = await request(app)
                .get('/api/v1/sessions/NONEXISTENT');

            expect(res.status).toBe(404);
        });

        it('should not return inactive sessions', async () => {
            const session = new InviteSession({
                boardId: '123',
                boardName: 'Test Board',
                sprintId: '456',
                sprintName: 'Sprint 1',
                companyId: admin.companyId,
                createdBy: admin._id.toString(),
                createdByName: admin.displayName,
                isActive: false // Inactive
            });
            await session.save();

            const res = await request(app)
                .get(`/api/v1/sessions/${session.sessionId}`);

            expect(res.status).toBe(404);
        });
    });

    // ===========================================
    // DELETE SESSION TESTS
    // ===========================================
    describe('DELETE /api/v1/sessions/:sessionId', () => {
        it('should delete own session', async () => {
            const session = new InviteSession({
                boardId: '123',
                boardName: 'Test Board',
                sprintId: '456',
                sprintName: 'Sprint 1',
                companyId: admin.companyId,
                createdBy: admin._id.toString(),
                createdByName: admin.displayName
            });
            await session.save();

            const res = await request(app)
                .delete(`/api/v1/sessions/${session.sessionId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Verify it's deleted
            const deleted = await InviteSession.findOne({ sessionId: session.sessionId });
            expect(deleted).toBeNull();
        });

        it('should not allow deleting others sessions', async () => {
            // Create session by different user
            const session = new InviteSession({
                boardId: '123',
                boardName: 'Test Board',
                sprintId: '456',
                sprintName: 'Sprint 1',
                companyId: admin.companyId,
                createdBy: 'different-user-id',
                createdByName: 'Other User'
            });
            await session.save();

            const res = await request(app)
                .delete(`/api/v1/sessions/${session.sessionId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(403);
        });
    });

    // ===========================================
    // GET MY SESSIONS TESTS
    // ===========================================
    describe('GET /api/v1/sessions', () => {
        it('should return sessions created by current user', async () => {
            // Create 2 sessions
            await InviteSession.create({
                boardId: '123',
                boardName: 'Board 1',
                sprintId: '456',
                sprintName: 'Sprint 1',
                companyId: admin.companyId,
                createdBy: admin._id.toString(),
                createdByName: admin.displayName
            });
            await InviteSession.create({
                boardId: '789',
                boardName: 'Board 2',
                sprintId: '012',
                sprintName: 'Sprint 2',
                companyId: admin.companyId,
                createdBy: admin._id.toString(),
                createdByName: admin.displayName
            });

            const res = await request(app)
                .get('/api/v1/sessions')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(2);
        });
    });
});
