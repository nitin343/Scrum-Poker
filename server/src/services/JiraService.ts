import axios, { AxiosInstance, AxiosResponse } from 'axios';
import JiraApi from 'jira-client';
import https from 'https';
import { logger } from '../utils/logger/Logger';

export interface JiraConfigOptions {
    protocol: string;
    host: string;
    base: string;
    username: string;
    password: string;
    apiVersion: string;
    strictSSL: boolean;
    headers: Record<string, string>;
}

export interface JiraConnectionResult {
    success: boolean;
    message: string;
    timestamp: Date;
}

export interface JiraUser {
    accountId: string;
    displayName: string;
    emailAddress: string;
}

export interface JiraBoard {
    id: number;
    name: string;
    type: string;
}

export interface JiraSprint {
    id: number;
    name: string;
    state: 'FUTURE' | 'ACTIVE' | 'CLOSED';
    startDate?: string;
    endDate?: string;
}

export interface JiraIssue {
    key: string;
    id: string;
    fields: {
        summary: string;
        description?: string;
        status: { name: string };
        assignee?: JiraUser;
        reporter?: JiraUser;
        customfield_10106?: number;
        issuetype: { name: string };
    };
}

class JiraService {
    private jiraClient: JiraApi | null = null;
    private axiosClient: AxiosInstance | null = null;
    private jiraConfig: JiraConfigOptions | null = null;
    private baseUrl: string = '';

    private loadConfig(): JiraConfigOptions {
        const protocol = process.env.JIRA_PROTOCOL?.trim() || 'https';
        const host = process.env.JIRA_HOST?.trim() || '';
        const base = this.normalizeBase(process.env.JIRA_BASE?.trim());
        const username = process.env.JIRA_USERNAME?.trim() || '';
        const password = process.env.JIRA_API_TOKEN?.trim() || '';
        const headers = this.buildHeaders();

        return {
            protocol,
            host,
            base,
            username,
            password,
            apiVersion: '2',
            strictSSL: true,
            headers
        };
    }

    private normalizeBase(base: string | undefined): string {
        if (!base) return '/jira';
        const normalized = base.startsWith('/') ? base : `/${base}`;
        return normalized.replace(/\/+$/, '');
    }

    private buildHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        const customHeaderName = process.env.JIRA_CUSTOM_HEADER_NAME?.trim();
        const customHeaderValue = process.env.JIRA_CUSTOM_HEADER_VALUE?.trim();

        if (customHeaderName && customHeaderValue) {
            headers[customHeaderName] = customHeaderValue;
        }

        return headers;
    }

    private getConfig(): JiraConfigOptions {
        if (!this.jiraConfig) {
            this.jiraConfig = this.loadConfig();
            this.logConfig(this.jiraConfig);
        }
        return this.jiraConfig;
    }

    private logConfig(config: JiraConfigOptions): void {
        logger.info('Jira Configuration loaded', {
            protocol: config.protocol,
            host: config.host,
            base: config.base || 'none',
            username: config.username ? config.username.substring(0, 3) + '***' : 'N/A',
            customHeaders: Object.keys(config.headers).filter(
                k => !['Accept', 'Content-Type'].includes(k)
            ).length > 0
        });
    }



    private getAxiosClient(): AxiosInstance {
        if (!this.axiosClient) {
            this.initClient();
        }
        return this.axiosClient!;
    }

    private async retryRequest<T>(requestFn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
        try {
            return await requestFn();
        } catch (error: any) {
            if (retries > 0 && (error.response?.status >= 500 || error.response?.status === 429)) {
                let waitTime = delay;

                // Check for Retry-After header
                const retryAfter = error.response?.headers?.['retry-after'];
                if (retryAfter) {
                    const seconds = parseInt(retryAfter, 10);
                    if (!isNaN(seconds)) {
                        waitTime = seconds * 1000;
                        logger.warn(`[Jira 503] Server requested wait: ${seconds}s`);
                    }
                }

                logger.warn(`Jira Request Failed (${error.response?.status}). Retrying in ${waitTime}ms... (${retries} retries left)`);
                await new Promise(resolve => setTimeout(resolve, waitTime));

                // If we waited a long time, don't backoff further exponentially, just retry
                const nextDelay = waitTime > 5000 ? waitTime : delay * 2.5;
                return this.retryRequest(requestFn, retries - 1, nextDelay);
            }
            throw error;
        }
    }

    public initClient(): void {
        try {
            const config = this.getConfig();

            if (!config.host || !config.username || !config.password) {
                throw new Error('Missing Jira credentials in environment');
            }

            this.baseUrl = `${config.protocol}://${config.host}${config.base}`;

            // Create HTTPS Agent with Keep-Alive
            const httpsAgent = new https.Agent({
                keepAlive: true,
                rejectUnauthorized: config.strictSSL
            });

            // Add standard User-Agent to avoid WAF blocking
            const headers = {
                ...config.headers,
                'User-Agent': 'ScrumPoker/1.0 (Node.js/Enterprise)'
            };

            this.jiraClient = new JiraApi({
                protocol: config.protocol,
                host: config.host,
                base: config.base,
                username: config.username,
                password: config.password,
                apiVersion: config.apiVersion,
                strictSSL: config.strictSSL,
                headers: headers
            });

            this.axiosClient = axios.create({
                baseURL: `${this.baseUrl}/rest`,
                auth: {
                    username: config.username,
                    password: config.password
                },
                headers: headers,
                timeout: 30000,
                httpsAgent: httpsAgent
            });

            logger.info('Jira client initialized successfully');
        } catch (error: any) {
            logger.error('Failed to initialize Jira client', { error: error.message });
            throw error;
        }
    }

    public async testConnection(): Promise<JiraConnectionResult> {
        try {
            console.log('Testing Jira Connection...');
            const client = this.getAxiosClient();

            const response = await this.retryRequest<AxiosResponse>(() => client.get('/api/2/myself'));

            if (response.status === 200 && response.data) {
                return {
                    success: true,
                    message: `Connected as ${response.data.displayName}`,
                    timestamp: new Date()
                };
            } else {
                return {
                    success: false,
                    message: `HTTP ${response.status}`,
                    timestamp: new Date()
                };
            }
        } catch (error: any) {
            return {
                success: false,
                message: error.message,
                timestamp: new Date()
            };
        }
    }

    public async getBoards(): Promise<JiraBoard[]> {
        try {
            console.log('\n📋 Fetching all JIRA boards...');
            const client = this.getAxiosClient();
            let allBoards: JiraBoard[] = [];
            let startAt = 0;
            const maxResults = 50;

            while (true) {
                const response = await client.get('/agile/1.0/board', {
                    params: { startAt, maxResults }
                });

                if (response.data.values && response.data.values.length > 0) {
                    allBoards = allBoards.concat(response.data.values);
                }

                if (response.data.isLast || !response.data.values || response.data.values.length < maxResults) {
                    break;
                }

                startAt += maxResults;
            }

            console.log(`✅ Found ${allBoards.length} boards\n`);
            allBoards.forEach((board: any, index: number) => {
                console.log(`  ${index + 1}. [${board.id}] ${board.name} (${board.type})`);
            });

            logger.info('Boards retrieved', { count: allBoards.length });
            return allBoards;
        } catch (error: any) {
            logger.error('Failed to get boards', { error: error.message, status: error.response?.status });
            console.log(`\n❌ Failed to get boards: ${error.message}\n`);
            return [];
        }
    }

    public async getSprints(boardId: number): Promise<JiraSprint[]> {
        try {
            console.log(`\n🏃 Fetching sprints from board ${boardId}...`);
            const client = this.getAxiosClient();
            let allSprints: JiraSprint[] = [];
            let startAt = 0;
            const maxResults = 50;

            while (true) {
                const response = await this.retryRequest<AxiosResponse>(() => client.get(`/agile/1.0/board/${boardId}/sprint`, {
                    params: { startAt, maxResults, state: 'FUTURE,ACTIVE,CLOSED' }
                }));

                // Debug Logging
                const values = response.data?.values || [];
                console.log(`[DEBUG] Page startAt=${startAt}, received ${values.length} sprints. IsLast=${response.data?.isLast}`);

                if (values.length > 0) {
                    allSprints = allSprints.concat(values);
                }

                if (response.data.isLast || values.length < maxResults) {
                    break;
                }

                startAt += maxResults;
            }

            console.log(`✅ Found ${allSprints.length} sprints\n`);
            allSprints.slice(0, 10).forEach((sprint: any, index: number) => {
                console.log(`  ${index + 1}. [${sprint.id}] ${sprint.name} - ${sprint.state}`);
            });

            logger.info('Sprints retrieved', { boardId, count: allSprints.length });
            return allSprints;
        } catch (error: any) {
            logger.error('Failed to get sprints', { boardId, error: error.message });
            console.log(`\n❌ Failed to get sprints: ${error.message}\n`);
            return [];
        }
    }

    public async getSprintIssues(sprintId: number, maxResults: number = 100): Promise<JiraIssue[]> {
        try {
            console.log(`\n📝 Fetching issues from sprint ${sprintId}...`);
            const client = this.getAxiosClient();
            const jql = `sprint = ${sprintId}`;

            const response = await this.retryRequest<AxiosResponse>(() => client.get('/api/2/search', {
                params: {
                    jql,
                    maxResults,
                    fields: 'summary,status,assignee,reporter,issuetype,customfield_10106,timetracking'
                }
            }));

            const issues = response.data.issues || [];

            console.log(`✅ Found ${response.data.total} issues\n`);
            issues.slice(0, 10).forEach((issue: any, index: number) => {
                console.log(`  ${index + 1}. ${issue.key}: ${issue.fields.summary.substring(0, 50)}`);
                console.log(`     Status: ${issue.fields.status.name} | Assignee: ${issue.fields.assignee?.displayName || 'Unassigned'}`);
            });

            logger.info('Sprint issues retrieved', { sprintId, count: issues.length });
            return issues;
        } catch (error: any) {
            logger.error('Failed to get sprint issues', { sprintId, error: error.message });
            console.log(`\n❌ Failed to get sprint issues: ${error.message}\n`);
            return [];
        }
    }

    public async getProjectUsers(projectKey: string): Promise<Map<string, string>> {
        try {
            console.log(`\n👥 Fetching users from project ${projectKey}...`);
            const client = this.getAxiosClient();
            const jql = `project = ${projectKey} ORDER BY updated DESC`;

            const response = await client.get('/api/2/search', {
                params: {
                    jql,
                    maxResults: 100,
                    fields: 'assignee,reporter'
                }
            });

            const users = new Map<string, string>();
            const issues = response.data.issues || [];

            issues.forEach((issue: any) => {
                if (issue.fields.assignee) {
                    users.set(issue.fields.assignee.accountId, issue.fields.assignee.displayName);
                }
                if (issue.fields.reporter) {
                    users.set(issue.fields.reporter.accountId, issue.fields.reporter.displayName);
                }
            });

            console.log(`✅ Found ${users.size} unique users\n`);
            Array.from(users.values()).slice(0, 15).forEach((name: string, index: number) => {
                console.log(`  ${index + 1}. ${name}`);
            });

            logger.info('Project users retrieved', { projectKey, count: users.size });
            return users;
        } catch (error: any) {
            logger.error('Failed to get project users', { projectKey, error: error.message });
            console.log(`\n❌ Failed to get project users: ${error.message}\n`);
            return new Map();
        }
    }

    public async getIssue(issueKey: string): Promise<JiraIssue | null> {
        try {
            console.log(`\n🔍 Fetching issue ${issueKey}...`);
            const client = this.getAxiosClient();

            const response = await client.get(`/api/2/issue/${issueKey}`, {
                params: {
                    fields: 'summary,status,assignee,reporter,issuetype,customfield_10106,description,timetracking'
                }
            });

            const issue = response.data;
            console.log(`✅ Issue retrieved\n`);
            console.log(`  Summary: ${issue.fields.summary}`);
            console.log(`  Status: ${issue.fields.status.name}`);
            console.log(`  Assignee: ${issue.fields.assignee?.displayName || 'Unassigned'}`);
            console.log(`  Story Points: ${issue.fields.customfield_10106 || 'Not set'}`);

            logger.info('Issue retrieved', { issueKey });
            return issue;
        } catch (error: any) {
            logger.error('Failed to get issue', { issueKey, error: error.message });
            console.log(`\n❌ Failed to get issue: ${error.message}\n`);
            return null;
        }
    }

    public async searchIssues(jql: string, maxResults: number = 50): Promise<JiraIssue[]> {
        try {
            console.log(`\n🔎 Searching issues with JQL: ${jql}`);
            const client = this.getAxiosClient();

            const response = await client.get('/api/2/search', {
                params: {
                    jql,
                    maxResults,
                    fields: 'summary,status,assignee,reporter,issuetype,customfield_10106'
                }
            });

            const issues = response.data.issues || [];
            console.log(`✅ Found ${response.data.total} issues (showing ${issues.length})\n`);

            logger.info('Issues searched', { jql, count: issues.length });
            return issues;
        } catch (error: any) {
            logger.error('Failed to search issues', { jql, error: error.message });
            console.log(`\n❌ Failed to search issues: ${error.message}\n`);
            return [];
        }
    }

    public async getServerInfo(): Promise<any> {
        try {
            const client = this.getAxiosClient();
            const response = await client.get('/api/2/serverInfo');

            logger.info('Server info retrieved', {
                version: response.data.version,
                buildNumber: response.data.buildNumber
            });

            return response.data;
        } catch (error: any) {
            logger.error('Failed to get server info', { error: error.message });
            return null;
        }
    }

    public async getProjectInfo(projectKey: string): Promise<any> {
        try {
            const client = this.getAxiosClient();
            const response = await client.get(`/api/2/project/${projectKey}`);

            logger.info('Project info retrieved', { projectKey, name: response.data.name });
            return response.data;
        } catch (error: any) {
            logger.error('Failed to get project info', { projectKey, error: error.message });
            return null;
        }
    }

    public async getCurrentUser(): Promise<JiraUser | null> {
        try {
            const client = this.getAxiosClient();
            const response = await client.get('/api/2/myself');

            logger.info('Current user retrieved', { user: response.data.displayName });
            return response.data;
        } catch (error: any) {
            logger.error('Failed to get current user', { error: error.message });
            return null;
        }
    }

    public async updateIssuePoints(issueKey: string, points: string | number, issueType: string): Promise<boolean> {
        try {
            console.log(`\n📝 Updating ${issueType} ${issueKey} with ${points}...`);
            const client = this.getAxiosClient();

            const isBug = issueType?.toLowerCase() === 'bug';
            let updatePayload: any = {};

            if (isBug) {
                // Time Tracking for Bugs - Jira expects timetracking object
                updatePayload = {
                    timetracking: {
                        originalEstimate: String(points),
                        remainingEstimate: String(points)
                    }
                };
            } else {
                // Story Points for others - customfield_10106 is standard Story Points field
                const numPoints = Number(points);
                updatePayload = {
                    customfield_10106: isNaN(numPoints) ? null : numPoints
                };
            }

            await client.put(`/api/2/issue/${issueKey}`, { fields: updatePayload });

            logger.info('Issue updated', { issueKey, points, issueType });
            console.log(`✅ Issue ${issueKey} updated successfully\n`);
            return true;
        } catch (error: any) {
            logger.error('Failed to update issue points', { issueKey, error: error.message });
            console.log(`\n❌ Failed to update issue points: ${error.message}\n`);
            return false;
        }
    }

    public async updateIssue(issueKey: string, fields: any): Promise<boolean> {
        try {
            console.log(`\n📝 Updating issue ${issueKey}...`);
            const client = this.getAxiosClient();

            await client.put(`/api/2/issue/${issueKey}`, { fields });

            logger.info('Issue updated', { issueKey, fields });
            console.log(`✅ Issue ${issueKey} updated successfully\n`);
            return true;
        } catch (error: any) {
            logger.error('Failed to update issue', { issueKey, error: error.message });
            console.log(`\n❌ Failed to update issue: ${error.message}\n`);
            return false;
        }
    }
}

export const jiraService = new JiraService();
