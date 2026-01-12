import { describe, it, expect, vi, beforeAll } from 'vitest';
import { aiService } from '../AIService';
import BoardContext from '../../models/BoardContext';

describe('AIService - chatWithContext', () => {
    beforeAll(() => {
        // Mock BoardContext
        vi.spyOn(BoardContext, 'findOne').mockResolvedValue({
            projectContext: 'Test Project using React and Node.js',
            codebaseMap: 'Frontend: React, Backend: Express'
        } as any);
    });

    it('should respond to a simple question', async () => {
        const messages = [
            { sender: 'user' as const, message: 'What is story point 5?', timestamp: new Date() }
        ];

        const response = await aiService.chatWithContext(messages, 'test-board');

        expect(response).toBeDefined();
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(0);
    });

    it('should use conversation history for context', async () => {
        const messages = [
            { sender: 'user' as const, message: 'We are using React', timestamp: new Date() },
            { sender: 'ai' as const, message: 'Got it, React frontend', timestamp: new Date() },
            { sender: 'user' as const, message: 'How should we structure components?', timestamp: new Date() }
        ];

        const response = await aiService.chatWithContext(messages, 'test-board');

        expect(response).toBeDefined();
        // Response should be contextually aware of React
        expect(response.toLowerCase()).toMatch(/component|react/);
    });

    it('should include board context in responses', async () => {
        const messages = [
            { sender: 'user' as const, message: 'What tech stack are we using?', timestamp: new Date() }
        ];

        const response = await aiService.chatWithContext(messages, 'test-board');

        expect(response).toBeDefined();
        // Should mention the project context
        expect(response.toLowerCase()).toMatch(/react|node/);
    });

    it('should handle empty message array', async () => {
        const messages: any[] = [];

        const response = await aiService.chatWithContext(messages, 'test-board');

        expect(response).toBeDefined();
        expect(typeof response).toBe('string');
    });

    it('should handle errors gracefully', async () => {
        // Test with invalid board ID to trigger potential errors
        const messages = [
            { sender: 'user' as const, message: 'Test question', timestamp: new Date() }
        ];

        // Even with errors, should return a string or null (not throw)
        const response = await aiService.chatWithContext(messages, 'invalid-board-id');

        // Should return a response (string) or null, not throw an error
        expect(response === null || typeof response === 'string').toBe(true);
    });
});
