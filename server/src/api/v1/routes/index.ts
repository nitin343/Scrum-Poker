import { Router } from 'express';
import authRoutes from './auth';
import jiraRoutes from './jira';
import sessionsRoutes from './sessions';
import sprintsRoutes from './sprints';
import aiRoutes from './ai';

const router = Router();

// API v1 routes
router.use('/auth', authRoutes);
router.use('/jira', jiraRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/sprints', sprintsRoutes);
router.use('/ai', aiRoutes);

export default router;
