import { Router } from 'express';
import * as aiController from '../../../controllers/AIController';

const router = Router();

// /api/v1/ai/boards/:boardId/context
router.get('/boards/:boardId/context', aiController.getContext);
router.post('/boards/:boardId/context', aiController.saveContext);

// /api/v1/ai/boards/:boardId/analyze
router.post('/boards/:boardId/analyze', aiController.analyzeRepositories);

export default router;
