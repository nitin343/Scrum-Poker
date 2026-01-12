import { describe, it, expect, vi, beforeAll } from 'vitest';
import BoardContext from '../models/BoardContext';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load real env
dotenv.config({ path: path.join(__dirname, '../../.env') });

describe('LLM Connection Verification', () => {
    beforeAll(() => {
        vi.spyOn(BoardContext, 'findOne').mockResolvedValue({
            projectContext: 'Test Project Context',
            codebaseMap: 'Test Codebase Map'
        } as any);
    });

    it('should connect to Siemens LLM and return an estimate', async () => {
        // Spy on logger to catch errors
        const { logger } = await import('../utils/logger/Logger');
        const errorSpy = vi.spyOn(logger, 'error');

        // Re-import to pick up new env
        vi.resetModules();
        const { aiService } = await import('../services/AIService');

        console.log('🤖 Testing connection with Key:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
        console.log('Target Model:', process.env.SIEMENS_LLM_MODEL);

        const ticket = {
            issueKey: 'TEST-1',
            summary: 'Login Feature',
            description: 'Implement login',
            issueType: 'Story',
            issueId: '1',
            votingRounds: []
        };

        const estimate = await aiService.estimateTicket(ticket as any, 'test-board');

        if (!estimate) {
            const errorArg: any = errorSpy.mock.calls[0]?.[1];
            const errorDetails = {
                model: process.env.SIEMENS_LLM_MODEL,
                keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 5),
                error: errorArg
            };
            fs.writeFileSync('verification_error.json', JSON.stringify(errorDetails, null, 2));
            console.error('❌ Error details written to verification_error.json');
        }

        expect(estimate).toBeDefined();
    }, 60000);
});
