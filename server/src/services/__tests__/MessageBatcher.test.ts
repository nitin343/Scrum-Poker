import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageBatcher } from '../MessageBatcher';

describe('MessageBatcher', () => {
    let batcher: MessageBatcher;
    let mockAIService: any;

    beforeEach(() => {
        mockAIService = {
            chatWithContext: vi.fn().mockResolvedValue('AI response')
        };
        batcher = new MessageBatcher(mockAIService);
    });

    it('should batch 5 messages into 1 API call', async () => {
        const roomId = 'room-123';

        // Add 5 messages (triggers immediate processing)
        const promises = [];
        for (let i = 0; i < 5; i++) {
            promises.push(batcher.addMessage(roomId, `Question ${i}`, 'user-1', 'User'));
        }

        // Wait for all to complete
        const responses = await Promise.all(promises);

        // Should call AI service only once
        expect(mockAIService.chatWithContext).toHaveBeenCalledTimes(1);

        // All responses should be the same
        responses.forEach(response => {
            expect(response).toBe('AI response');
        });
    });

    it('should handle multiple rooms independently', async () => {
        const room1 = 'room-1';
        const room2 = 'room-2';

        // Add 5 messages to room 1
        const promises1 = [];
        for (let i = 0; i < 5; i++) {
            promises1.push(batcher.addMessage(room1, `Room 1 Q${i}`, 'user-1', 'User'));
        }

        // Add 5 messages to room 2
        const promises2 = [];
        for (let i = 0; i < 5; i++) {
            promises2.push(batcher.addMessage(room2, `Room 2 Q${i}`, 'user-2', 'User'));
        }

        await Promise.all([...promises1, ...promises2]);

        // Should have called AI service twice (once per room)
        expect(mockAIService.chatWithContext).toHaveBeenCalledTimes(2);
    });

    it('should clear batch after processing', async () => {
        const roomId = 'room-123';

        // Add 5 messages to trigger immediate processing
        const promises = [];
        for (let i = 0; i < 5; i++) {
            promises.push(batcher.addMessage(roomId, `Question ${i}`, 'user-1', 'User'));
        }

        await Promise.all(promises);

        // Batch should be cleared
        const batches = batcher.getBatches();
        expect(batches.get(roomId)?.length || 0).toBe(0);
    });

    it('should handle AI service errors gracefully', async () => {
        mockAIService.chatWithContext.mockRejectedValue(new Error('API Error'));

        const roomId = 'room-123';

        // Add 5 messages
        const promises = [];
        for (let i = 0; i < 5; i++) {
            promises.push(batcher.addMessage(roomId, `Question ${i}`, 'user-1', 'User'));
        }

        const responses = await Promise.all(promises);

        // Should return error message
        responses.forEach(response => {
            expect(response).toContain('error');
        });
    });

    it('should return AI response to all callers in batch', async () => {
        mockAIService.chatWithContext.mockResolvedValue('This is the AI answer');

        const roomId = 'room-123';

        // Add 5 messages
        const promises = [];
        for (let i = 0; i < 5; i++) {
            promises.push(batcher.addMessage(roomId, `Question ${i}`, 'user-1', 'User'));
        }

        const responses = await Promise.all(promises);

        // All should get the same response
        responses.forEach(response => {
            expect(response).toBe('This is the AI answer');
        });
    });

    it('should include messages in context when calling AI', async () => {
        const roomId = 'room-123';

        // Mock empty history to ensure only new messages are counted
        batcher.setHistoryProvider(async () => []);

        // Add 5 messages
        const promises = [];
        for (let i = 0; i < 5; i++) {
            promises.push(batcher.addMessage(roomId, `Question ${i}`, 'user-1', 'User'));
        }

        await Promise.all(promises);

        // Check that AI was called with all 5 messages
        const callArgs = mockAIService.chatWithContext.mock.calls[0];
        const messages = callArgs[0];

        expect(messages.length).toBe(5);
        expect(messages[0].message).toBe('Question 0');
        expect(messages[4].message).toBe('Question 4');
    });
});
