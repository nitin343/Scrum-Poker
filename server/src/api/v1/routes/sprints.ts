import { Router, Request, Response } from 'express';
import { Sprint } from '../../../models/Sprint';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../../../utils/logger/Logger';

const router = Router();

/**
 * GET /api/v1/sprints/board/:boardId
 * Get all sprints for a board
 */
router.get('/board/:boardId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { boardId } = req.params;
        const companyId = (req as any).user.companyId;

        const sprints = await Sprint.find({
            boardId,
            companyId
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: sprints.map(s => ({
                id: s._id,
                sprintId: s.sprintId,
                sprintName: s.sprintName,
                boardId: s.boardId,
                status: s.status,
                isEnabled: s.isEnabled,
                jiraState: s.jiraState,
                currentIssueIndex: s.currentIssueIndex,
                ticketCount: s.tickets.length,
                createdAt: s.createdAt
            }))
        });
    } catch (error: any) {
        logger.error('Get sprints error', { error: error.message });
        res.status(500).json({ error: error.message || 'Failed to get sprints' });
    }
});

/**
 * GET /api/v1/sprints/:sprintId
 * Get sprint details with tickets
 */
router.get('/:sprintId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { sprintId } = req.params;
        const companyId = (req as any).user.companyId;

        const sprint = await Sprint.findOne({ sprintId, companyId });

        if (!sprint) {
            return res.status(404).json({ error: 'Sprint not found' });
        }

        res.json({
            success: true,
            data: sprint
        });
    } catch (error: any) {
        logger.error('Get sprint error', { error: error.message });
        res.status(500).json({ error: error.message || 'Failed to get sprint' });
    }
});

/**
 * PATCH /api/v1/sprints/:sprintId/enable
 * Enable a sprint for planning poker
 */
router.patch('/:sprintId/enable', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { sprintId } = req.params;
        const companyId = (req as any).user.companyId;

        const sprint = await Sprint.findOneAndUpdate(
            { sprintId, companyId },
            { isEnabled: true },
            { new: true }
        );

        if (!sprint) {
            return res.status(404).json({ error: 'Sprint not found' });
        }

        logger.info('Sprint enabled', { sprintId });

        res.json({
            success: true,
            message: 'Sprint enabled',
            data: {
                sprintId: sprint.sprintId,
                sprintName: sprint.sprintName,
                isEnabled: sprint.isEnabled
            }
        });
    } catch (error: any) {
        logger.error('Enable sprint error', { error: error.message });
        res.status(500).json({ error: error.message || 'Failed to enable sprint' });
    }
});

/**
 * PATCH /api/v1/sprints/:sprintId/disable
 * Disable a sprint
 */
router.patch('/:sprintId/disable', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { sprintId } = req.params;
        const companyId = (req as any).user.companyId;

        const sprint = await Sprint.findOneAndUpdate(
            { sprintId, companyId },
            { isEnabled: false },
            { new: true }
        );

        if (!sprint) {
            return res.status(404).json({ error: 'Sprint not found' });
        }

        logger.info('Sprint disabled', { sprintId });

        res.json({
            success: true,
            message: 'Sprint disabled',
            data: {
                sprintId: sprint.sprintId,
                sprintName: sprint.sprintName,
                isEnabled: sprint.isEnabled
            }
        });
    } catch (error: any) {
        logger.error('Disable sprint error', { error: error.message });
        res.status(500).json({ error: error.message || 'Failed to disable sprint' });
    }
});

/**
 * PATCH /api/v1/sprints/:sprintId/current-issue
 * Update current issue index for a sprint
 */
router.patch('/:sprintId/current-issue', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { sprintId } = req.params;
        const { issueIndex } = req.body;
        const companyId = (req as any).user.companyId;

        if (typeof issueIndex !== 'number' || issueIndex < 0) {
            return res.status(400).json({ error: 'Valid issueIndex is required' });
        }

        const sprint = await Sprint.findOneAndUpdate(
            { sprintId, companyId },
            { currentIssueIndex: issueIndex },
            { new: true }
        );

        if (!sprint) {
            return res.status(404).json({ error: 'Sprint not found' });
        }

        // Get the current issue
        const currentIssue = sprint.tickets[issueIndex] || null;

        res.json({
            success: true,
            data: {
                sprintId: sprint.sprintId,
                currentIssueIndex: sprint.currentIssueIndex,
                currentIssue,
                totalIssues: sprint.tickets.length
            }
        });
    } catch (error: any) {
        logger.error('Update current issue error', { error: error.message });
        res.status(500).json({ error: error.message || 'Failed to update current issue' });
    }
});

/**
 * POST /api/v1/sprints/:sprintId/sync-jira
 * Sync sprint with Jira (fetch issues and update local data)
 */
router.post('/:sprintId/sync-jira', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { sprintId } = req.params;
        const { boardId, issues, jiraState } = req.body;
        const companyId = (req as any).user.companyId;

        if (!issues || !Array.isArray(issues)) {
            return res.status(400).json({ error: 'Issues array is required' });
        }

        // Find or create sprint
        let sprint = await Sprint.findOne({ sprintId, companyId });

        if (!sprint) {
            // Create new sprint
            const { sprintName } = req.body;
            if (!sprintName || !boardId) {
                return res.status(400).json({ error: 'sprintName and boardId required for new sprint' });
            }

            sprint = new Sprint({
                sprintId,
                sprintName,
                boardId,
                companyId,
                shareableCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                jiraState: jiraState?.toLowerCase() || 'future',
                tickets: []
            });
        }

        // Update jiraState
        if (jiraState) {
            sprint.jiraState = jiraState.toLowerCase() as 'future' | 'active' | 'closed';

            // Auto-enable active sprints
            if (jiraState.toLowerCase() === 'active') {
                sprint.isEnabled = true;
            }
        }

        // Transform and merge issues - Minimal Storage Strategy
        const transformedTickets = issues.map((issue: any) => ({
            issueKey: issue.key as string,
            issueId: issue.id as string,
            issueType: (issue.fields?.issuetype?.name || 'Story') as 'Story' | 'Bug' | 'Task' | 'Sub-task',
            // Minimal or empty strings for optional fields if needed, but we made them optional in Schema
            // We do NOT store summary, description, assignee to save DB space
            // jiraUrl: (issue.self || '') as string,
            currentPoints: issue.fields?.customfield_10106 as number | undefined,
            votingRounds: [] as any[]
        }));

        // Merge with existing tickets (preserve voting history)
        for (const newTicket of transformedTickets) {
            const existingIndex = sprint.tickets.findIndex(t => t.issueKey === newTicket.issueKey);
            if (existingIndex >= 0) {
                // Update fields but preserve votingRounds
                const existing = sprint.tickets[existingIndex];
                Object.assign(sprint.tickets[existingIndex], {
                    ...newTicket,
                    votingRounds: existing.votingRounds
                });
            } else {
                sprint.tickets.push(newTicket as any);
            }
        }

        await sprint.save();

        logger.info('Sprint synced with Jira', {
            sprintId,
            ticketCount: sprint.tickets.length
        });

        res.json({
            success: true,
            message: 'Sprint synced',
            data: {
                sprintId: sprint.sprintId,
                sprintName: sprint.sprintName,
                jiraState: sprint.jiraState,
                isEnabled: sprint.isEnabled,
                ticketCount: sprint.tickets.length
            }
        });
    } catch (error: any) {
        logger.error('Sync sprint error', { error: error.message });
        res.status(500).json({ error: error.message || 'Failed to sync sprint' });
    }
});

export default router;
