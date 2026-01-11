"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const JiraService_1 = require("../../../services/JiraService");
const auth_1 = require("../middleware/auth");
const Logger_1 = require("../../../utils/logger/Logger");
const Sprint_1 = __importDefault(require("../../../models/Sprint"));
const router = (0, express_1.Router)();
router.get('/test-connection', auth_1.authMiddleware, async (req, res) => {
    try {
        Logger_1.logger.info('Testing Jira connection');
        const result = await JiraService_1.jiraService.testConnection();
        res.status(200).json({
            connected: result.success,
            message: result.message,
            timestamp: result.timestamp
        });
    }
    catch (error) {
        Logger_1.logger.error('Jira connection test failed', { error: error.message });
        res.status(500).json({
            connected: false,
            message: 'Connection test failed'
        });
    }
});
router.get('/boards', auth_1.authMiddleware, async (req, res) => {
    try {
        Logger_1.logger.info('Fetching Jira boards');
        const boards = await JiraService_1.jiraService.getBoards();
        res.status(200).json({
            success: true,
            boards,
            count: boards.length
        });
    }
    catch (error) {
        Logger_1.logger.error('Failed to fetch boards', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch boards'
        });
    }
});
router.get('/boards/:boardId/sprints', auth_1.authMiddleware, async (req, res) => {
    try {
        const boardId = parseInt(req.params.boardId);
        Logger_1.logger.info('Fetching sprints for board', { boardId });
        if (isNaN(boardId)) {
            return res.status(400).json({ error: 'Invalid board ID' });
        }
        const sprints = await JiraService_1.jiraService.getSprints(boardId);
        res.status(200).json({
            success: true,
            sprints,
            count: sprints.length
        });
    }
    catch (error) {
        Logger_1.logger.error('Failed to fetch sprints', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sprints'
        });
    }
});
router.get('/sprints/:sprintId/issues', auth_1.authMiddleware, async (req, res) => {
    try {
        const sprintId = parseInt(req.params.sprintId);
        const maxResults = parseInt(req.query.maxResults) || 100;
        Logger_1.logger.info('Fetching sprint issues', { sprintId, maxResults });
        if (isNaN(sprintId)) {
            return res.status(400).json({ error: 'Invalid sprint ID' });
        }
        const issues = await JiraService_1.jiraService.getSprintIssues(sprintId, maxResults);
        res.status(200).json({
            success: true,
            issues,
            count: issues.length
        });
    }
    catch (error) {
        Logger_1.logger.error('Failed to fetch sprint issues', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sprint issues'
        });
    }
});
router.get('/projects/:projectKey/users', auth_1.authMiddleware, async (req, res) => {
    try {
        const projectKey = req.params.projectKey;
        Logger_1.logger.info('Fetching project users', { projectKey });
        const users = await JiraService_1.jiraService.getProjectUsers(projectKey);
        const usersArray = Array.from(users.entries()).map(([id, name]) => ({ id, name }));
        res.status(200).json({
            success: true,
            users: usersArray,
            count: usersArray.length
        });
    }
    catch (error) {
        Logger_1.logger.error('Failed to fetch project users', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch project users'
        });
    }
});
router.get('/issues/:issueKey', auth_1.authMiddleware, async (req, res) => {
    try {
        const issueKey = req.params.issueKey;
        Logger_1.logger.info('Fetching issue', { issueKey });
        const issue = await JiraService_1.jiraService.getIssue(issueKey);
        if (!issue) {
            return res.status(404).json({
                success: false,
                message: 'Issue not found'
            });
        }
        res.status(200).json({
            success: true,
            issue
        });
    }
    catch (error) {
        Logger_1.logger.error('Failed to fetch issue', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch issue'
        });
    }
});
// Update issue story points or time estimate
router.put('/issues/:issueKey/points', auth_1.authMiddleware, async (req, res) => {
    try {
        const issueKey = req.params.issueKey;
        const { points, issueType, votingResults, sprintId } = req.body;
        Logger_1.logger.info('Updating issue points', { issueKey, points, issueType, sprintId });
        console.log(`\n🎯 [API] Updating ${issueKey} with points:`, points, 'type:', issueType);
        if (points === undefined || points === null || points === '') {
            return res.status(400).json({
                success: false,
                message: 'Points value is required'
            });
        }
        // 1. Update Jira
        try {
            await JiraService_1.jiraService.updateIssuePoints(issueKey, points, issueType);
        }
        catch (jiraError) {
            console.error('❌ [API] Jira Update Failed:', jiraError?.response?.data || jiraError.message);
            return res.status(500).json({
                success: false,
                message: 'Failed to update Jira: ' + (jiraError?.response?.data?.errorMessages?.join(', ') || jiraError.message)
            });
        }
        // 2. Update Sprint DB with voting history
        if (votingResults) {
            try {
                // Scope by sprintId if provided to ensure we update the active sprint, not an old one
                const query = sprintId
                    ? { sprintId, "tickets.issueKey": issueKey }
                    : { "tickets.issueKey": issueKey };
                const sprint = await Sprint_1.default.findOne(query);
                if (sprint) {
                    const ticketIndex = sprint.tickets.findIndex(t => t.issueKey === issueKey);
                    if (ticketIndex >= 0) {
                        const ticket = sprint.tickets[ticketIndex];
                        // Add new voting round
                        ticket.votingRounds.push({
                            roundNumber: votingResults.roundNumber || (ticket.votingRounds.length + 1),
                            votes: votingResults.votes || [],
                            average: votingResults.average,
                            agreement: votingResults.agreement,
                            finalPoints: issueType === 'Story' ? Number(points) : undefined,
                            finalTimeEstimate: issueType === 'Bug' ? String(points) : undefined,
                            revealedAt: new Date(),
                            updatedInJira: true
                        });
                        // Update current points in DB too
                        if (issueType === 'Story')
                            ticket.currentPoints = Number(points);
                        if (issueType === 'Bug')
                            ticket.timeEstimate = String(points);
                        await sprint.save();
                        console.log(`💾 [DB] Saved voting history for ${issueKey}`);
                    }
                }
                else {
                    console.warn(`⚠️ [DB] Sprint not found for issue ${issueKey} - cannot save history`);
                }
            }
            catch (dbError) {
                console.error('❌ [API] DB Save Failed:', dbError.message);
                // We don't block the response since Jira was updated, but we log the error
                // Optionally return 207 Multi-Status or just warning
            }
        }
        res.status(200).json({
            success: true,
            message: 'Issue updated successfully',
            issueKey,
            value: points
        });
    }
    catch (error) {
        Logger_1.logger.error('Failed to update issue points', { error: error.message });
        console.log('❌ [API] Fatal Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update issue points: ' + error.message
        });
    }
});
router.get('/search', auth_1.authMiddleware, async (req, res) => {
    try {
        const jql = req.query.jql;
        const maxResults = parseInt(req.query.maxResults) || 50;
        if (!jql) {
            return res.status(400).json({ error: 'JQL parameter is required' });
        }
        Logger_1.logger.info('Searching issues', { jql, maxResults });
        const issues = await JiraService_1.jiraService.searchIssues(jql, maxResults);
        res.status(200).json({
            success: true,
            issues,
            count: issues.length
        });
    }
    catch (error) {
        Logger_1.logger.error('Failed to search issues', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to search issues'
        });
    }
});
router.get('/server-info', auth_1.authMiddleware, async (req, res) => {
    try {
        Logger_1.logger.info('Fetching server info');
        const info = await JiraService_1.jiraService.getServerInfo();
        if (!info) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch server info'
            });
        }
        res.status(200).json({
            success: true,
            info
        });
    }
    catch (error) {
        Logger_1.logger.error('Failed to fetch server info', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch server info'
        });
    }
});
router.get('/projects/:projectKey/info', auth_1.authMiddleware, async (req, res) => {
    try {
        const projectKey = req.params.projectKey;
        Logger_1.logger.info('Fetching project info', { projectKey });
        const info = await JiraService_1.jiraService.getProjectInfo(projectKey);
        if (!info) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }
        res.status(200).json({
            success: true,
            info
        });
    }
    catch (error) {
        Logger_1.logger.error('Failed to fetch project info', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch project info'
        });
    }
});
router.get('/current-user', auth_1.authMiddleware, async (req, res) => {
    try {
        Logger_1.logger.info('Fetching current user');
        const user = await JiraService_1.jiraService.getCurrentUser();
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Failed to fetch current user'
            });
        }
        res.status(200).json({
            success: true,
            user
        });
    }
    catch (error) {
        Logger_1.logger.error('Failed to fetch current user', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch current user'
        });
    }
});
exports.default = router;
