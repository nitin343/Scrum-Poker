"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Sprint_1 = require("../../../models/Sprint");
const auth_1 = require("../middleware/auth");
const Logger_1 = require("../../../utils/logger/Logger");
const router = (0, express_1.Router)();
/**
 * GET /api/v1/sprints/board/:boardId
 * Get all sprints for a board
 */
router.get('/board/:boardId', auth_1.authMiddleware, async (req, res) => {
    try {
        const { boardId } = req.params;
        const companyId = req.user.companyId;
        const sprints = await Sprint_1.Sprint.find({
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
    }
    catch (error) {
        Logger_1.logger.error('Get sprints error', { error: error.message });
        res.status(500).json({ error: error.message || 'Failed to get sprints' });
    }
});
/**
 * GET /api/v1/sprints/:sprintId
 * Get sprint details with tickets
 */
router.get('/:sprintId', auth_1.authMiddleware, async (req, res) => {
    try {
        const { sprintId } = req.params;
        const companyId = req.user.companyId;
        const sprint = await Sprint_1.Sprint.findOne({ sprintId, companyId });
        if (!sprint) {
            return res.status(404).json({ error: 'Sprint not found' });
        }
        res.json({
            success: true,
            data: sprint
        });
    }
    catch (error) {
        Logger_1.logger.error('Get sprint error', { error: error.message });
        res.status(500).json({ error: error.message || 'Failed to get sprint' });
    }
});
/**
 * PATCH /api/v1/sprints/:sprintId/enable
 * Enable a sprint for planning poker
 */
router.patch('/:sprintId/enable', auth_1.authMiddleware, async (req, res) => {
    try {
        const { sprintId } = req.params;
        const companyId = req.user.companyId;
        const sprint = await Sprint_1.Sprint.findOneAndUpdate({ sprintId, companyId }, { isEnabled: true }, { new: true });
        if (!sprint) {
            return res.status(404).json({ error: 'Sprint not found' });
        }
        Logger_1.logger.info('Sprint enabled', { sprintId });
        res.json({
            success: true,
            message: 'Sprint enabled',
            data: {
                sprintId: sprint.sprintId,
                sprintName: sprint.sprintName,
                isEnabled: sprint.isEnabled
            }
        });
    }
    catch (error) {
        Logger_1.logger.error('Enable sprint error', { error: error.message });
        res.status(500).json({ error: error.message || 'Failed to enable sprint' });
    }
});
/**
 * PATCH /api/v1/sprints/:sprintId/disable
 * Disable a sprint
 */
router.patch('/:sprintId/disable', auth_1.authMiddleware, async (req, res) => {
    try {
        const { sprintId } = req.params;
        const companyId = req.user.companyId;
        const sprint = await Sprint_1.Sprint.findOneAndUpdate({ sprintId, companyId }, { isEnabled: false }, { new: true });
        if (!sprint) {
            return res.status(404).json({ error: 'Sprint not found' });
        }
        Logger_1.logger.info('Sprint disabled', { sprintId });
        res.json({
            success: true,
            message: 'Sprint disabled',
            data: {
                sprintId: sprint.sprintId,
                sprintName: sprint.sprintName,
                isEnabled: sprint.isEnabled
            }
        });
    }
    catch (error) {
        Logger_1.logger.error('Disable sprint error', { error: error.message });
        res.status(500).json({ error: error.message || 'Failed to disable sprint' });
    }
});
/**
 * PATCH /api/v1/sprints/:sprintId/current-issue
 * Update current issue index for a sprint
 */
router.patch('/:sprintId/current-issue', auth_1.authMiddleware, async (req, res) => {
    try {
        const { sprintId } = req.params;
        const { issueIndex } = req.body;
        const companyId = req.user.companyId;
        if (typeof issueIndex !== 'number' || issueIndex < 0) {
            return res.status(400).json({ error: 'Valid issueIndex is required' });
        }
        const sprint = await Sprint_1.Sprint.findOneAndUpdate({ sprintId, companyId }, { currentIssueIndex: issueIndex }, { new: true });
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
    }
    catch (error) {
        Logger_1.logger.error('Update current issue error', { error: error.message });
        res.status(500).json({ error: error.message || 'Failed to update current issue' });
    }
});
/**
 * POST /api/v1/sprints/:sprintId/sync-jira
 * Sync sprint with Jira (fetch issues and update local data)
 */
router.post('/:sprintId/sync-jira', auth_1.authMiddleware, async (req, res) => {
    try {
        const { sprintId } = req.params;
        const { boardId, issues, jiraState } = req.body;
        const companyId = req.user.companyId;
        if (!issues || !Array.isArray(issues)) {
            return res.status(400).json({ error: 'Issues array is required' });
        }
        // Find or create sprint
        let sprint = await Sprint_1.Sprint.findOne({ sprintId, companyId });
        if (!sprint) {
            // Create new sprint
            const { sprintName } = req.body;
            if (!sprintName || !boardId) {
                return res.status(400).json({ error: 'sprintName and boardId required for new sprint' });
            }
            sprint = new Sprint_1.Sprint({
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
            sprint.jiraState = jiraState.toLowerCase();
            // Auto-enable active sprints
            if (jiraState.toLowerCase() === 'active') {
                sprint.isEnabled = true;
            }
        }
        // Transform and merge issues - Minimal Storage Strategy
        const transformedTickets = issues.map((issue) => ({
            issueKey: issue.key,
            issueId: issue.id,
            issueType: (issue.fields?.issuetype?.name || 'Story'),
            // Minimal or empty strings for optional fields if needed, but we made them optional in Schema
            // We do NOT store summary, description, assignee to save DB space
            // jiraUrl: (issue.self || '') as string,
            currentPoints: issue.fields?.customfield_10106,
            votingRounds: []
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
            }
            else {
                sprint.tickets.push(newTicket);
            }
        }
        await sprint.save();
        Logger_1.logger.info('Sprint synced with Jira', {
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
    }
    catch (error) {
        Logger_1.logger.error('Sync sprint error', { error: error.message });
        res.status(500).json({ error: error.message || 'Failed to sync sprint' });
    }
});
exports.default = router;
