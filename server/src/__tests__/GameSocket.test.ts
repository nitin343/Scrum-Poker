
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Client, { Socket as ClientSocket } from 'socket.io-client';
import { setupSocket } from '../socket';
import { AddressInfo } from 'net';

// Use vi.hoisted to ensure mocks are available in vi.mock factories
const mocks = vi.hoisted(() => ({
    jiraService: {
        getIssue: vi.fn(),
        updateIssuePoints: vi.fn()
    },
    sprintModel: {
        findOne: vi.fn(),
        save: vi.fn()
    },
    sessionService: {
        getSession: vi.fn()
    }
}));

// Mock JiraService
vi.mock('../services/JiraService', () => ({
    jiraService: mocks.jiraService
}));

// Mock Sprint Model
vi.mock('../models/Sprint', () => ({
    default: mocks.sprintModel
}));

// Mock SessionService
vi.mock('../services/SessionService', () => ({
    sessionService: mocks.sessionService
}));


describe('GameSocket', () => {
    let io: Server;
    let clientSocket: ClientSocket;
    let httpServer: any;

    beforeEach(async () => {
        // Reset Mocks
        vi.clearAllMocks();

        // Setup Test Server
        httpServer = createServer();
        io = new Server(httpServer);
        await setupSocket(io);

        // Listen on random port
        await new Promise<void>((resolve) => httpServer.listen(() => resolve()));
        const port = (httpServer.address() as AddressInfo).port;

        // Connect Client
        clientSocket = Client(`http://localhost:${port}`);

        await new Promise<void>((resolve) => clientSocket.on('connect', resolve));
    });

    afterEach(() => {
        io.close();
        clientSocket.close();
        httpServer.close();
    });

    it('should allow a user to join a room', async () => {
        return new Promise<void>((resolve) => {
            const joinData = {
                roomId: 'test-room',
                odId: 'user-1',
                displayName: 'Tester',
                isScrumMaster: true,
                roomName: 'My Room'
            };

            // Join Room
            clientSocket.emit('join_room', joinData);

            clientSocket.on('room_update', (room) => {
                expect(room.roomId).toBe(joinData.roomId);
                expect(room.roomName).toBe(joinData.roomName);
                const participant = room.participants.find((p: any) => p.odId === joinData.odId);
                expect(participant).toBeDefined();
                expect(participant.displayName).toBe('Tester');
                resolve();
            });
        });
    });

    it('should set issues and broadcast the first one', async () => {
        // 1. Join
        clientSocket.emit('join_room', { roomId: 'room-1', odId: 'sm-1', displayName: 'SM', isScrumMaster: true });

        // Wait for join
        await new Promise<void>(resolve => {
            clientSocket.once('room_update', () => resolve());
        });

        // 2. Set Issues
        mocks.jiraService.getIssue.mockResolvedValue({
            key: 'JIRA-101',
            id: '10001',
            fields: {
                summary: 'Mock Summary',
                issuetype: { name: 'Story' },
                customfield_10106: 5
            }
        });

        const issues = [{ key: 'JIRA-101', id: '10001', summary: 'Mock Summary' }];
        clientSocket.emit('set_issues', { roomId: 'room-1', issues });

        // 3. Verify Broadcast
        return new Promise<void>(resolve => {
            clientSocket.on('issue_changed', (data) => {
                expect(data.issue).toBeDefined();
                expect(data.issue.issueKey).toBe('JIRA-101');
                expect(data.issueIndex).toBe(0);
                resolve();
            });
        });
    });

    it('should handle card selection and update vote status', async () => {
        // 1. Join
        clientSocket.emit('join_room', { roomId: 'room-v', odId: 'voter-1', displayName: 'Voter', isScrumMaster: false });
        await new Promise<void>(res => clientSocket.once('room_update', res));

        // 2. Mock Issue
        clientSocket.emit('set_issues', {
            roomId: 'room-v',
            issues: [{ key: 'JIRA-1', summary: 'Test' }]
        });
        await new Promise<void>(res => clientSocket.once('issue_changed', res));

        // 3. Select Card
        return new Promise<void>(resolve => {
            clientSocket.emit('select_card', { roomId: 'room-v', odId: 'voter-1', card: 8 });

            clientSocket.on('vote_update', ({ odId, hasVoted }) => {
                expect(odId).toBe('voter-1');
                expect(hasVoted).toBe(true);
                resolve();
            });
        });
    });
});
