/**
 * Integration Test: Game Room Data Flow
 * 
 * This test verifies the complete data flow:
 * 1. User joins room with correct odId
 * 2. User selects a card (vote recorded)
 * 3. Reveal cards (votes saved to DB)
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Client, { Socket as ClientSocket } from 'socket.io-client';
import { setupSocket } from '../socket';
import { AddressInfo } from 'net';
import mongoose from 'mongoose';

// Use vi.hoisted for proper mock initialization
const mocks = vi.hoisted(() => ({
    jiraService: {
        getIssue: vi.fn(),
        updateIssuePoints: vi.fn()
    },
    // We need a proper mock for Sprint model with save functionality
    sprintData: {
        sprintId: 'test-sprint',
        tickets: [] as any[],
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

// Mock Sprint Model - returns our mock data
vi.mock('../models/Sprint', () => ({
    default: {
        findOne: vi.fn().mockImplementation(async () => mocks.sprintData)
    }
}));

// Mock SessionService
vi.mock('../services/SessionService', () => ({
    sessionService: mocks.sessionService
}));

describe('Game Room Data Flow Integration', () => {
    let io: Server;
    let scrumMasterSocket: ClientSocket;
    let participantSocket: ClientSocket;
    let httpServer: any;
    let port: number;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Reset mock data
        mocks.sprintData.tickets = [{
            issueKey: 'TEST-1',
            issueId: '1001',
            issueType: 'Story',
            votingRounds: []
        }];
        mocks.sprintData.save.mockResolvedValue(true);

        // Setup Test Server
        httpServer = createServer();
        io = new Server(httpServer);
        await setupSocket(io);

        // Listen on random port
        await new Promise<void>((resolve) => httpServer.listen(() => resolve()));
        port = (httpServer.address() as AddressInfo).port;
    });

    afterEach(async () => {
        if (scrumMasterSocket) scrumMasterSocket.close();
        if (participantSocket) participantSocket.close();
        io.close();
        httpServer.close();
    });

    const createClient = async (): Promise<ClientSocket> => {
        const client = Client(`http://localhost:${port}`);
        await new Promise<void>((resolve) => client.on('connect', resolve));
        return client;
    };

    it('should register participant with correct odId on join', async () => {
        scrumMasterSocket = await createClient();

        return new Promise<void>((resolve) => {
            scrumMasterSocket.emit('join_room', {
                roomId: 'test-room-1',
                odId: 'user-123',
                displayName: 'Test User',
                isScrumMaster: true,
                roomName: 'Test Room'
            });

            scrumMasterSocket.on('room_update', (room) => {
                expect(room.roomId).toBe('test-room-1');
                const participant = room.participants.find((p: any) => p.odId === 'user-123');
                expect(participant).toBeDefined();
                expect(participant.displayName).toBe('Test User');
                resolve();
            });
        });
    });

    it('should record vote when select_card is called with correct odId', async () => {
        scrumMasterSocket = await createClient();

        // 1. Join Room
        scrumMasterSocket.emit('join_room', {
            roomId: 'test-room-2',
            odId: 'voter-456',
            displayName: 'Voter',
            isScrumMaster: true
        });
        await new Promise<void>(res => scrumMasterSocket.once('room_update', res));

        // 2. Set Issues
        scrumMasterSocket.emit('set_issues', {
            roomId: 'test-room-2',
            issues: [{ key: 'TEST-1', id: '1001', summary: 'Test Issue' }]
        });
        await new Promise<void>(res => scrumMasterSocket.once('issue_changed', res));

        // 3. Select Card
        return new Promise<void>((resolve) => {
            scrumMasterSocket.emit('select_card', {
                roomId: 'test-room-2',
                odId: 'voter-456',
                card: 8
            });

            scrumMasterSocket.on('vote_update', ({ odId, hasVoted }) => {
                expect(odId).toBe('voter-456');
                expect(hasVoted).toBe(true);
                resolve();
            });
        });
    });

    it('should save votes to database when reveal_cards is called', async () => {
        scrumMasterSocket = await createClient();

        // 1. Join Room
        scrumMasterSocket.emit('join_room', {
            roomId: 'test-room-3',
            odId: 'sm-789',
            displayName: 'Scrum Master',
            isScrumMaster: true
        });
        await new Promise<void>(res => scrumMasterSocket.once('room_update', res));

        // 2. Set Issues
        scrumMasterSocket.emit('set_issues', {
            roomId: 'test-room-3',
            issues: [{ key: 'TEST-1', id: '1001', summary: 'Test Issue' }]
        });
        await new Promise<void>(res => scrumMasterSocket.once('issue_changed', res));

        // 3. Select Card
        scrumMasterSocket.emit('select_card', {
            roomId: 'test-room-3',
            odId: 'sm-789',
            card: 5
        });
        await new Promise<void>(res => scrumMasterSocket.once('vote_update', res));

        // 4. Reveal Cards
        return new Promise<void>((resolve) => {
            scrumMasterSocket.emit('reveal_cards', { roomId: 'test-room-3' });

            scrumMasterSocket.on('cards_revealed', async (data) => {
                expect(data.participants).toBeDefined();
                expect(data.participants.length).toBeGreaterThan(0);

                // Verify save was called
                // Note: Due to async nature, we may need a small delay
                await new Promise(r => setTimeout(r, 100));

                expect(mocks.sprintData.save).toHaveBeenCalled();

                // Verify voting round was added
                expect(mocks.sprintData.tickets[0].votingRounds.length).toBeGreaterThan(0);

                const round = mocks.sprintData.tickets[0].votingRounds[0];
                expect(round.votes).toBeDefined();
                expect(round.votes.length).toBeGreaterThan(0);
                expect(round.votes[0].participantId).toBe('sm-789');
                expect(round.votes[0].vote).toBe('5');

                resolve();
            });
        });
    });

    it('should fail to record vote if odId does not match any participant', async () => {
        scrumMasterSocket = await createClient();

        // 1. Join Room
        scrumMasterSocket.emit('join_room', {
            roomId: 'test-room-4',
            odId: 'valid-user',
            displayName: 'Valid User',
            isScrumMaster: true
        });
        await new Promise<void>(res => scrumMasterSocket.once('room_update', res));

        // 2. Try to select card with wrong odId
        scrumMasterSocket.emit('select_card', {
            roomId: 'test-room-4',
            odId: 'wrong-user-id', // This should NOT match
            card: 3
        });

        // Wait for potential vote_update (there shouldn't be one)
        await new Promise(r => setTimeout(r, 200));

        // The vote_update should NOT have been emitted for this wrong user
        // We verify by checking room state
        return new Promise<void>((resolve) => {
            scrumMasterSocket.emit('join_room', {
                roomId: 'test-room-4',
                odId: 'valid-user',
                displayName: 'Valid User',
                isScrumMaster: true
            });

            scrumMasterSocket.once('room_update', (room) => {
                const validUser = room.participants.find((p: any) => p.odId === 'valid-user');
                // Valid user should NOT have voted since we used wrong odId
                expect(validUser.hasVoted).toBe(false);
                resolve();
            });
        });
    });
});
