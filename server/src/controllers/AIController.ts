import { Request, Response } from 'express';
import BoardContext from '../models/BoardContext';
import { logger } from '../utils/logger/Logger';

export const getContext = async (req: Request, res: Response) => {
    try {
        const { boardId } = req.params;
        if (!boardId) {
            return res.status(400).json({ success: false, error: 'Board ID is required' });
        }

        const context = await BoardContext.findOne({ boardId });
        return res.json({ success: true, data: context || {} });
    } catch (error) {
        logger.error('Error fetching board context', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch context' });
    }
};

export const saveContext = async (req: Request, res: Response) => {
    try {
        const { boardId } = req.params;
        const { projectContext, backendRepoUrl, frontendRepoUrl } = req.body;

        if (!boardId) {
            return res.status(400).json({ success: false, error: 'Board ID is required' });
        }

        const context = await BoardContext.findOneAndUpdate(
            { boardId },
            {
                boardId,
                projectContext,
                backendRepoUrl,
                frontendRepoUrl
            },
            { new: true, upsert: true }
        );

        return res.json({ success: true, data: context });
    } catch (error) {
        logger.error('Error saving board context', error);
        return res.status(500).json({ success: false, error: 'Failed to save context' });
    }
};

import { githubService } from '../services/GitHubService';

export const analyzeRepositories = async (req: Request, res: Response) => {
    try {
        const { boardId } = req.params;
        logger.info(`Analysis triggered for board ${boardId}`);

        // 1. Get current URLs
        const currentContext = await BoardContext.findOne({ boardId });
        const backendUrl = currentContext?.backendRepoUrl || '';
        const frontendUrl = currentContext?.frontendRepoUrl || '';

        // 2. Generate Map
        const codebaseMap = await githubService.generateCodebaseMap(backendUrl, frontendUrl);

        // 3. Save Map
        const context = await BoardContext.findOneAndUpdate(
            { boardId },
            {
                codebaseMap,
                lastAnalyzedAt: new Date()
            },
            { new: true, upsert: true }
        );

        return res.json({
            success: true,
            message: 'Analysis completed',
            data: context
        });
    } catch (error) {
        logger.error('Error analyzing repositories', error);
        return res.status(500).json({ success: false, error: 'Analysis failed' });
    }
};
