import { Sprint } from '../models/Sprint';
import { jiraService } from './JiraService';
import { logger } from '../utils/logger/Logger';

/**
 * SprintService - Handles sprint operations
 */
class SprintService {
    /**
     * Get all sprints for a company
     */
    public async getCompanySprints(companyId: string) {
        try {
            return await Sprint.find({ companyId });
        } catch (error: any) {
            logger.error('Failed to get company sprints', { error: error.message });
            throw error;
        }
    }

    /**
     * Get sprint by ID
     */
    public async getSprintById(sprintId: string) {
        try {
            return await Sprint.findById(sprintId);
        } catch (error: any) {
            logger.error('Failed to get sprint', { error: error.message });
            throw error;
        }
    }

    /**
     * Create new sprint
     */
    public async createSprint(sprintData: {
        name: string;
        companyId: string;
        jiraId?: string;
        boardId?: string;
        startDate?: Date;
        endDate?: Date;
    }) {
        try {
            const sprint = new Sprint(sprintData);
            await sprint.save();
            logger.info('Sprint created', { sprintId: sprint._id });
            return sprint;
        } catch (error: any) {
            logger.error('Failed to create sprint', { error: error.message });
            throw error;
        }
    }

    /**
     * Update sprint
     */
    public async updateSprint(sprintId: string, updates: Partial<any>) {
        try {
            const sprint = await Sprint.findByIdAndUpdate(sprintId, updates, { new: true });
            logger.info('Sprint updated', { sprintId });
            return sprint;
        } catch (error: any) {
            logger.error('Failed to update sprint', { error: error.message });
            throw error;
        }
    }

    /**
     * Sync sprint from Jira
     */
    public async syncFromJira(boardId: number, companyId: string) {
        try {
            const jiraSprints = await jiraService.getSprints(boardId);
            const synced = [];

            for (const jiraSprint of jiraSprints) {
                const existing = await Sprint.findOne({
                    jiraId: jiraSprint.id,
                    companyId
                });

                if (existing) {
                    await this.updateSprint(existing._id.toString(), {
                        name: jiraSprint.name,
                        state: jiraSprint.state,
                        startDate: jiraSprint.startDate,
                        endDate: jiraSprint.endDate
                    });
                } else {
                    await this.createSprint({
                        name: jiraSprint.name,
                        companyId,
                        jiraId: jiraSprint.id.toString(),
                        boardId: boardId.toString(),
                        startDate: jiraSprint.startDate ? new Date(jiraSprint.startDate) : undefined,
                        endDate: jiraSprint.endDate ? new Date(jiraSprint.endDate) : undefined
                    });
                }
                synced.push(jiraSprint.id);
            }

            logger.info('Sprints synced from Jira', { count: synced.length });
            return synced;
        } catch (error: any) {
            logger.error('Failed to sync sprints from Jira', { error: error.message });
            throw error;
        }
    }
}

export const sprintService = new SprintService();
