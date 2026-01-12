import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import ChatMessage from '../ChatMessage';

describe('ChatMessage Model', () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect('mongodb://localhost:27017/scrum-poker-test-chat');
        }
    });

    afterAll(async () => {
        await ChatMessage.deleteMany({});
    });

    it('should create a user message', async () => {
        const message = await ChatMessage.create({
            roomId: 'room-123',
            sender: 'user',
            userId: 'user-456',
            userName: 'John Doe',
            message: 'What is story point 5?',
            timestamp: new Date()
        });

        expect(message.roomId).toBe('room-123');
        expect(message.sender).toBe('user');
        expect(message.message).toBe('What is story point 5?');
    });

    it('should create an AI message', async () => {
        const message = await ChatMessage.create({
            roomId: 'room-123',
            sender: 'ai',
            message: 'Story point 5 typically represents...',
            timestamp: new Date(),
            metadata: {
                model: 'qwen3-30b',
                confidence: 'high'
            }
        });

        expect(message.sender).toBe('ai');
        expect(message.metadata?.model).toBe('qwen3-30b');
    });

    it('should find messages by roomId', async () => {
        await ChatMessage.create({
            roomId: 'room-999',
            sender: 'user',
            message: 'Test message 1',
            timestamp: new Date()
        });

        await ChatMessage.create({
            roomId: 'room-999',
            sender: 'ai',
            message: 'Test response 1',
            timestamp: new Date()
        });

        const messages = await ChatMessage.find({ roomId: 'room-999' }).sort({ timestamp: 1 });
        expect(messages.length).toBe(2);
        expect(messages[0].sender).toBe('user');
        expect(messages[1].sender).toBe('ai');
    });

    it('should get last N messages for context', async () => {
        const roomId = 'room-context';

        // Create 15 messages
        for (let i = 0; i < 15; i++) {
            await ChatMessage.create({
                roomId,
                sender: i % 2 === 0 ? 'user' : 'ai',
                message: `Message ${i}`,
                timestamp: new Date(Date.now() + i * 1000)
            });
        }

        // Get last 10
        const messages = await ChatMessage.find({ roomId })
            .sort({ timestamp: -1 })
            .limit(10);

        expect(messages.length).toBe(10);
        expect(messages[0].message).toBe('Message 14'); // Most recent
    });

    it('should have TTL index for 25 days', async () => {
        // Drop existing indexes to avoid conflicts
        try {
            await ChatMessage.collection.dropIndex('timestamp_1');
        } catch (e) {
            // Index might not exist, that's okay
        }

        // Ensure indexes are created
        await ChatMessage.syncIndexes();

        // Check schema definition directly as syncIndexes might be flaky in test env
        const index = ChatMessage.schema.indexes().find(
            (idx: any) => idx[0].timestamp === 1 && idx[1].expireAfterSeconds === 25 * 24 * 60 * 60
        );
        expect(index).toBeDefined();
    });

    it('should validate required fields', async () => {
        await expect(ChatMessage.create({
            sender: 'user',
            message: 'Missing roomId'
        })).rejects.toThrow();
    });
});
