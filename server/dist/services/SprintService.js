"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sprintService = void 0;
const Sprint_1 = require("../models/Sprint");
const JiraService_1 = require("./JiraService");
const Logger_1 = require("../utils/logger/Logger");
/**
 * SprintService - Handles sprint operations
 */
class SprintService {
    /**
     * Get all sprints for a company
     */
    async getCompanySprints(companyId) {
        try {
            return await Sprint_1.Sprint.find({ companyId });
        }
        catch (error) {
            Logger_1.logger.error('Failed to get company sprints', { error: error.message });
            throw error;
        }
    }
    /**
     * Get sprint by ID
     */
    async getSprintById(sprintId) {
        try {
            return await Sprint_1.Sprint.findById(sprintId);
        }
        catch (error) {
            Logger_1.logger.error('Failed to get sprint', { error: error.message });
            throw error;
        }
    }
    /**
     * Create new sprint
     */
    async createSprint(sprintData) {
        try {
            const sprint = new Sprint_1.Sprint(sprintData);
            await sprint.save();
            Logger_1.logger.info('Sprint created', { sprintId: sprint._id });
            return sprint;
        }
        catch (error) {
            Logger_1.logger.error('Failed to create sprint', { error: error.message });
            throw error;
        }
    }
    /**
     * Update sprint
     */
    async updateSprint(sprintId, updates) {
        try {
            const sprint = await Sprint_1.Sprint.findByIdAndUpdate(sprintId, updates, { new: true });
            Logger_1.logger.info('Sprint updated', { sprintId });
            return sprint;
        }
        catch (error) {
            Logger_1.logger.error('Failed to update sprint', { error: error.message });
            throw error;
        }
    }
    /**
     * Sync sprint from Jira
     */
    async syncFromJira(boardId, companyId) {
        try {
            const jiraSprints = await JiraService_1.jiraService.getSprints(boardId);
            const synced = [];
            for (const jiraSprint of jiraSprints) {
                const existing = await Sprint_1.Sprint.findOne({
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
                }
                else {
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
            Logger_1.logger.info('Sprints synced from Jira', { count: synced.length });
            return synced;
        }
        catch (error) {
            Logger_1.logger.error('Failed to sync sprints from Jira', { error: error.message });
            throw error;
        }
    }
}
exports.sprintService = new SprintService();
