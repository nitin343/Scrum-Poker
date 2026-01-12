import OpenAI from 'openai';
import dotenv from 'dotenv';
import { logger } from '../utils/logger/Logger';
import BoardContext from '../models/BoardContext';
import { ITicket } from '../models/Sprint';
import { RateLimiter } from '../utils/RateLimiter';

dotenv.config();

export interface IAIEstimate {
    story_points: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    risk_factors?: string[];
}

class AIService {
    private client: OpenAI | null = null;
    private model: string;
    private isSiemensLLM: boolean = false;
    private rateLimiter: RateLimiter;

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;

        // Initialize rate limiter (30 requests per 60 seconds)
        this.rateLimiter = new RateLimiter(30, 60000, 10);

        if (!apiKey) {
            logger.warn('OPENAI_API_KEY not found. AI features will be disabled.');
            this.model = 'gpt-4o-mini';
            return;
        }

        const clientConfig: any = { apiKey };

        // CRITICAL: Auto-detect Siemens LLM
        if (apiKey.startsWith('SIAK-')) {
            clientConfig.baseURL = process.env.SIEMENS_LLM_BASE_URL;
            this.isSiemensLLM = true;
            logger.success('🔒 Using Siemens internal LLM (data stays in Siemens)');
            // Default to 'reasoning' (qwen3-30b-a3b-thinking-2507) if not specified
            this.model = process.env.SIEMENS_LLM_MODEL || 'reasoning';
        } else {
            logger.info('🌐 Using external OpenAI (data goes to OpenAI)');
            this.model = process.env.SIEMENS_LLM_MODEL || 'gpt-4o-mini';
        }

        this.client = new OpenAI(clientConfig);
    }

    /**
     * Mock estimate for testing/dev without API keys
     */
    async mockEstimate(ticket: ITicket): Promise<IAIEstimate> {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
        return {
            story_points: 5,
            confidence: 'medium',
            reasoning: 'Mock Estimate: Ticket appears to involve standard CRUD operations.',
            risk_factors: ['Mock Risk: Database migration might be needed']
        };
    }

    /**
     * Estimates story points for a ticket using AI.
     */
    async estimateTicket(ticket: ITicket, boardId: string): Promise<IAIEstimate | null> {
        // Fallback to mock if client not ready
        if (!this.client) {
            logger.warn('AI Client not initialized. Using Mock Estimate.');
            return this.mockEstimate(ticket);
        }

        try {
            // Fetch Board Context (Project Tech Stack, etc.)
            const context = await BoardContext.findOne({ boardId });
            const systemContext = context?.projectContext || 'No specific project context provided.';
            const codebaseMap = context?.codebaseMap || '';

            const prompt = `
            You are an expert software engineer. Estimate story points for this JIRA story using the Fibonacci sequence (1, 2, 3, 5, 8, 13, 21).

            CONTEXT:
            ${systemContext}

            CODEBASE MAP:
            ${codebaseMap}

            TICKET:
            Summary: ${ticket.summary}
            Description: ${ticket.description}
            Acceptance Criteria: ${this.extractAC(ticket.description || '')}

            Respond strictly with this JSON structure:
            {
                "story_points": <number>,
                "confidence": "high|medium|low",
                "reasoning": "<short explanation, max 3 sentences>",
                "risk_factors": ["<risk 1>", "<risk 2>"]
            }
            `;



            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: 'You are an expert agile estimator. Respond ONLY with valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                response_format: { type: 'json_object' }
            });

            const content = response.choices[0].message.content;
            if (!content) return null;

            return JSON.parse(content) as IAIEstimate;

        } catch (error) {
            logger.error('AI Estimation failed:', error);
            return null;
        }
    }

    private extractAC(description: string): string {
        // Simple heuristic to find AC if labeled in text
        const lower = description.toLowerCase();
        if (lower.includes('acceptance criteria')) {
            return description.substring(lower.indexOf('acceptance criteria'));
        }
        return '';
    }

    /**
     * Chat with AI using conversation context
     */
    async chatWithContext(
        messages: Array<{ sender: 'user' | 'ai'; message: string; timestamp: Date }>,
        roomId: string
    ): Promise<string | null> {
        // Fallback if client not ready
        if (!this.client) {
            return 'AI is currently unavailable. Please try again later.';
        }

        try {
            // Acquire rate limiter token
            try {
                await this.rateLimiter.acquire();
            } catch (rateLimitError: any) {
                logger.warn('Rate limiter queue full for chat. Returning error message.');
                return 'AI is busy right now. Please try again in a moment.';
            }

            // 1. Get Room State & Current Issue
            // We need to dynamically import access to the store to avoid circular dependencies if any
            const { getRoom } = await import('../store');
            const room = getRoom(roomId);
            const currentIssue = room?.currentIssue;



            // 2. Get Board Context
            let systemContext = 'General software development project.';
            if (room?.boardId) {
                const context = await BoardContext.findOne({ boardId: room.boardId });
                if (context?.projectContext) {
                    systemContext = context.projectContext;
                }
            }

            // 3. Build Ticket Context
            let ticketContext = '';
            if (currentIssue) {
                ticketContext = `
Active Ticket:
- Key: ${currentIssue.issueKey}
- Summary: ${currentIssue.summary}
- Description: ${currentIssue.description || 'No description provided.'}
- Acceptance Criteria: ${this.extractAC(currentIssue.description || '')}
- Status: ${currentIssue.status || 'Unknown'}
- Priority: ${currentIssue.priority || 'None'}
- Reporter: ${currentIssue.reporter || 'Unknown'}
- Labels: ${currentIssue.labels?.join(', ') || 'None'}
- Current Points: ${currentIssue.currentPoints || 'Not estimated'}
- Comments: 
${currentIssue.comments?.map(c => `  - [${c.author}]: ${c.body}`).join('\n') || '  None'}
- Attachments: 
${currentIssue.attachments?.map(a => `  - ${a.filename} (${a.url})`).join('\n') || '  None'}
- Linked Issues: 
${currentIssue.issuelinks?.map(l => `  - ${l.type}: ${l.outwardIssue?.key || l.inwardIssue?.key} (${l.outwardIssue?.summary || l.inwardIssue?.summary})`).join('\n') || '  None'}

[AI MEMORY]
- My Estimated Points for this ticket: ${room?.aiAnalysis?.story_points || 'Not yet estimated by me'}
- My Confidence: ${room?.aiAnalysis?.confidence || 'N/A'}
- My Reasoning: ${room?.aiAnalysis?.reasoning || 'N/A'}
`;
            } else {
                ticketContext = 'No active ticket selected.';
            }

            // 4. Build System Prompt
            const systemPrompt = `You are an expert software engineer and a PARTICIPANT in this sprint planning poker session.
${ticketContext}

Project Context:
${systemContext}

Your role:
- Act as a senior team member, not just a facilitator.
- Openly share your opinion on story points.
- CRITICAL: If you see [AI MEMORY] above, that IS your estimate. If asked "Why X?", explain your reasoning confidently. Do not hide behind "I am an AI" or "The team must decide".
- You CAN suggest estimates based on the details provided.
- Be concise (under 3 sentences) unless asked for details.`;

            // Convert messages to OpenAI format
            const conversationHistory = messages.map(m => ({
                role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
                content: m.message
            }));

            // Call LLM
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...conversationHistory
                ],
                temperature: 0.2, // Low temperature for high accuracy/consistency
                top_p: 0.9,       // Nucleus sampling to further reduce hallucinations
                frequency_penalty: 0.1, // Slight penalty to avoid robotic repetition
                seed: 1234,       // Best-effort determinism for consistent answers
                max_tokens: 131072 // Massive context for reasoning model as requested
            });

            const content = response.choices[0].message.content;
            if (!content) {
                console.error('[AI ERROR] Empty content received:', JSON.stringify(response, null, 2));
                return 'I apologize, but I couldn\'t generate a response. Please check server logs for details.';
            }
            return content;

        } catch (error: any) {
            // Handle rate limit errors (429)
            if (error.response?.status === 429) {
                logger.warn('API rate limit exceeded (429) for chat.');
                return 'I\'m receiving too many requests right now. Please try again in a moment.';
            }

            logger.error('AI Chat failed:', error);
            return 'I encountered an issue connecting to the AI service. Please try again.';
        }
    }

    /**
     * Updates the board context (Project Tech Stack)
     */
    async updateContext(boardId: string, context: string) {
        return BoardContext.findOneAndUpdate(
            { boardId },
            { $set: { projectContext: context } },
            { upsert: true, new: true }
        );
    }
}

export const aiService = new AIService();
