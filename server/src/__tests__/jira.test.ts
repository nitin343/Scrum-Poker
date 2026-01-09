import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { Admin } from '../models/Admin';
import { jiraService } from '../services/JiraService';
import jwt from 'jsonwebtoken';

// Mock the JiraService
vi.mock('../services/JiraService', () => ({
    jiraService: {
        testConnection: vi.fn(),
        initClient: vi.fn(),
        getBoards: vi.fn(),
        getSprints: vi.fn(),
        getSprintIssues: vi.fn()
    }
}));

describe('Jira Routes', () => {
    let authToken: string;

    beforeEach(async () => {
        const admin = new Admin({
            email: 'jiratest@test.com',
            password: 'SecurePass123',
            displayName: 'Jira Test User'
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
        vi.clearAllMocks();
    });

    describe('GET /api/v1/jira/test-connection', () => {
        it('should return connection status as success', async () => {
            (jiraService.testConnection as any).mockResolvedValue({
                success: true,
                message: 'Connected as test_user',
                timestamp: new Date()
            });

            const res = await request(app)
                .get('/api/v1/jira/test-connection')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.connected).toBeTruthy();
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/v1/jira/test-connection');

            expect(res.status).toBe(401);
        });

        it('should return connection status as failure', async () => {
            (jiraService.testConnection as any).mockResolvedValue({
                success: false,
                message: 'Connection failed: Timeout',
                timestamp: new Date()
            });

            const res = await request(app)
                .get('/api/v1/jira/test-connection')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
        });
    });
});