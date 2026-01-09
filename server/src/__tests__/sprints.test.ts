import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { Admin } from '../models/Admin';
import { Sprint } from '../models/Sprint';
import jwt from 'jsonwebtoken';

describe('Sprint Routes', () => {
    let admin: any;
    let authToken: string;
    let testSprint: any;

    beforeEach(async () => {
        admin = new Admin({
            email: 'sprinttest@test.com',
            password: 'SecurePass123',
            displayName: 'Sprint Test Admin'
        });
        await admin.save();

        authToken = jwt.sign(
            { id: admin._id, email: admin.email, companyId: admin.companyId },
            process.env.JWT_SECRET!,
            { expiresIn: '1h' }
        );

        // Create a test sprint
        testSprint = await Sprint.create({
            sprintId: 'sprint-123',
            sprintName: 'Test Sprint',
            boardId: 'board-456',
            companyId: admin.companyId,
            shareableCode: 'TST123',
            jiraState: 'active',
            isEnabled: false,
            tickets: []
        });
    });

    afterEach(async () => {
        await Admin.deleteMany({});
        await Sprint.deleteMany({});
        vi.clearAllMocks();
    });

    // ===========================================
    // GET SPRINTS BY BOARD
    // ===========================================
    describe('GET /api/v1/sprints/board/:boardId', () => {
        it('should return sprints for a board', async () => {
            const res = await request(app)
                .get('/api/v1/sprints/board/board-456')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].sprintName).toBe('Test Sprint');
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/v1/sprints/board/board-456');

            expect(res.status).toBe(401);
        });
    });

    // ===========================================
    // ENABLE/DISABLE SPRINT
    // ===========================================
    describe('PATCH /api/v1/sprints/:sprintId/enable', () => {
        it('should enable a sprint', async () => {
            const res = await request(app)
                .patch('/api/v1/sprints/sprint-123/enable')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.isEnabled).toBe(true);

            // Verify in database
            const updated = await Sprint.findOne({ sprintId: 'sprint-123' });
            expect(updated?.isEnabled).toBe(true);
        });
    });

    describe('PATCH /api/v1/sprints/:sprintId/disable', () => {
        it('should disable a sprint', async () => {
            // First enable it
            await Sprint.updateOne({ sprintId: 'sprint-123' }, { isEnabled: true });

            const res = await request(app)
                .patch('/api/v1/sprints/sprint-123/disable')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.isEnabled).toBe(false);
        });
    });

    // ===========================================
    // SYNC JIRA
    // ===========================================
    describe('POST /api/v1/sprints/:sprintId/sync-jira', () => {
        it('should sync issues from Jira', async () => {
            const mockIssues = [
                {
                    key: 'GDT-123',
                    self: 'https://jira.example.com/rest/api/2/issue/GDT-123',
                    fields: {
                        summary: 'Test Issue',
                        issuetype: { name: 'Story' }
                    }
                },
                {
                    key: 'GDT-124',
                    self: 'https://jira.example.com/rest/api/2/issue/GDT-124',
                    fields: {
                        summary: 'Bug Fix',
                        issuetype: { name: 'Bug' }
                    }
                }
            ];

            const res = await request(app)
                .post('/api/v1/sprints/sprint-123/sync-jira')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    boardId: 'board-456',
                    issues: mockIssues,
                    jiraState: 'ACTIVE'
                });

            expect(res.status).toBe(200);
            expect(res.body.data.ticketCount).toBe(2);

            // Verify in database
            const updated = await Sprint.findOne({ sprintId: 'sprint-123' });
            expect(updated?.tickets.length).toBe(2);
            expect(updated?.jiraState).toBe('active');
        });

        it('should preserve existing voting rounds on sync', async () => {
            // Add a ticket with voting history
            await Sprint.updateOne(
                { sprintId: 'sprint-123' },
                {
                    tickets: [{
                        issueKey: 'GDT-123',
                        summary: 'Original Summary',
                        issueType: 'Story',
                        jiraUrl: '',
                        votingRounds: [{
                            roundNumber: 1,
                            votes: [{ participantName: 'User1', participantId: 'u1', vote: 5, votedAt: new Date() }],
                            updatedInJira: false
                        }]
                    }]
                }
            );

            // Sync with updated summary but same issue key
            const res = await request(app)
                .post('/api/v1/sprints/sprint-123/sync-jira')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    boardId: 'board-456',
                    issues: [{
                        key: 'GDT-123',
                        fields: {
                            summary: 'Updated Summary',
                            issuetype: { name: 'Story' }
                        }
                    }]
                });

            expect(res.status).toBe(200);

            // Verify voting history is preserved
            const updated = await Sprint.findOne({ sprintId: 'sprint-123' });
            expect(updated?.tickets[0].votingRounds.length).toBe(1);
            expect(updated?.tickets[0].votingRounds[0].votes[0].vote).toBe(5);
        });
    });
});
