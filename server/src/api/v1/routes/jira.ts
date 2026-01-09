import { Router, Request, Response } from 'express';
import { jiraService } from '../../../services/JiraService';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../../../utils/logger/Logger';

const router = Router();

router.get('/test-connection', authMiddleware, async (req: Request, res: Response) => {
    try {
        logger.info('Testing Jira connection');
        const result = await jiraService.testConnection();

        res.status(200).json({
            connected: result.success,
            message: result.message,
            timestamp: result.timestamp
        });
    } catch (error: any) {
        logger.error('Jira connection test failed', { error: error.message });
        res.status(500).json({
            connected: false,
            message: 'Connection test failed'
        });
    }
});

router.get('/boards', authMiddleware, async (req: Request, res: Response) => {
    try {
        logger.info('Fetching Jira boards');
        const boards = await jiraService.getBoards();

        res.status(200).json({
            success: true,
            boards,
            count: boards.length
        });
    } catch (error: any) {
        logger.error('Failed to fetch boards', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch boards'
        });
    }
});

router.get('/boards/:boardId/sprints', authMiddleware, async (req: Request, res: Response) => {
    try {
        const boardId = parseInt(req.params.boardId);
        logger.info('Fetching sprints for board', { boardId });

        if (isNaN(boardId)) {
            return res.status(400).json({ error: 'Invalid board ID' });
        }

        const sprints = await jiraService.getSprints(boardId);

        res.status(200).json({
            success: true,
            sprints,
            count: sprints.length
        });
    } catch (error: any) {
        logger.error('Failed to fetch sprints', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sprints'
        });
    }
});

router.get('/sprints/:sprintId/issues', authMiddleware, async (req: Request, res: Response) => {
    try {
        const sprintId = parseInt(req.params.sprintId);
        const maxResults = parseInt(req.query.maxResults as string) || 100;

        logger.info('Fetching sprint issues', { sprintId, maxResults });

        if (isNaN(sprintId)) {
            return res.status(400).json({ error: 'Invalid sprint ID' });
        }

        const issues = await jiraService.getSprintIssues(sprintId, maxResults);

        res.status(200).json({
            success: true,
            issues,
            count: issues.length
        });
    } catch (error: any) {
        logger.error('Failed to fetch sprint issues', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sprint issues'
        });
    }
});

router.get('/projects/:projectKey/users', authMiddleware, async (req: Request, res: Response) => {
    try {
        const projectKey = req.params.projectKey;
        logger.info('Fetching project users', { projectKey });

        const users = await jiraService.getProjectUsers(projectKey);
        const usersArray = Array.from(users.entries()).map(([id, name]) => ({ id, name }));

        res.status(200).json({
            success: true,
            users: usersArray,
            count: usersArray.length
        });
    } catch (error: any) {
        logger.error('Failed to fetch project users', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch project users'
        });
    }
});

router.get('/issues/:issueKey', authMiddleware, async (req: Request, res: Response) => {
    try {
        const issueKey = req.params.issueKey;
        logger.info('Fetching issue', { issueKey });

        const issue = await jiraService.getIssue(issueKey);

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
    } catch (error: any) {
        logger.error('Failed to fetch issue', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch issue'
        });
    }
});

router.get('/search', authMiddleware, async (req: Request, res: Response) => {
    try {
        const jql = req.query.jql as string;
        const maxResults = parseInt(req.query.maxResults as string) || 50;

        if (!jql) {
            return res.status(400).json({ error: 'JQL parameter is required' });
        }

        logger.info('Searching issues', { jql, maxResults });
        const issues = await jiraService.searchIssues(jql, maxResults);

        res.status(200).json({
            success: true,
            issues,
            count: issues.length
        });
    } catch (error: any) {
        logger.error('Failed to search issues', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to search issues'
        });
    }
});

router.get('/server-info', authMiddleware, async (req: Request, res: Response) => {
    try {
        logger.info('Fetching server info');
        const info = await jiraService.getServerInfo();

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
    } catch (error: any) {
        logger.error('Failed to fetch server info', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch server info'
        });
    }
});

router.get('/projects/:projectKey/info', authMiddleware, async (req: Request, res: Response) => {
    try {
        const projectKey = req.params.projectKey;
        logger.info('Fetching project info', { projectKey });

        const info = await jiraService.getProjectInfo(projectKey);

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
    } catch (error: any) {
        logger.error('Failed to fetch project info', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch project info'
        });
    }
});

router.get('/current-user', authMiddleware, async (req: Request, res: Response) => {
    try {
        logger.info('Fetching current user');
        const user = await jiraService.getCurrentUser();

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
    } catch (error: any) {
        logger.error('Failed to fetch current user', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch current user'
        });
    }
});

export default router;
