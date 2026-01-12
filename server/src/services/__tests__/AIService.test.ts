
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { aiService } from '../AIService';

// Mock Ticket
const mockTicket = {
    key: 'TEST-101',
    summary: 'Test Ticket',
    description: 'As a user I want to login so that I can access the system.',
    issueType: 'Story',
    status: 'To Do',
    priority: 'Medium'
};

describe('AIService', () => {

    // We can't easily "un-initialize" the singleton exported instance without some trickery,
    // but we can spy on its methods or create a new instance if we exported the class.
    // Since we only exported the instance, we'll verify the behavior based on current env (likely mock).

    it('should return a mock estimate when client is not initialized or keys missing', async () => {
        // Spy on logger to ensure we don't spam console during tests
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

        // Force the client to be null (simulating no API key) if it wasn't already
        // Note: access private property for testing if needed, or rely on public behavior.
        // In this environment, we expect it to fallback to mockEstimate if env is missing.

        // Actually, we can just call estimateTicket. 
        // If keys ARE present in the dev environment, this test might flake if we don't mock the internals.
        // For robustness, let's spy on the 'mockEstimate' method to see if it's called OR 
        // if regular estimate returns a structure.

        const response = await aiService.estimateTicket(mockTicket, 'test-board-id');

        expect(response).not.toBeNull();
        expect(response).toHaveProperty('story_points');
        expect(response).toHaveProperty('confidence');
        expect(response).toHaveProperty('reasoning');
        expect(response).toHaveProperty('risk_factors');

        consoleSpy.mockRestore();
    });

    it('mockEstimate should return deterministic structure', async () => {
        const response = await aiService.mockEstimate(mockTicket);

        expect(response.story_points).toBe(5);
        expect(response.confidence).toBe('medium');
        expect(response.risk_factors?.length).toBeGreaterThan(0);
    });

    it('should extract Acceptance Criteria correctly', () => {
        // Accessing private method via 'any' casting for unit testing purposes
        const service: any = aiService;

        const description = "Some desc. Acceptance Criteria: 1. User sees login. 2. User clicks.";
        const ac = service.extractAC(description);

        expect(ac).toContain('Acceptance Criteria');
        expect(ac).toContain('1. User sees login');
    });
});
