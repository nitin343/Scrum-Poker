declare module 'jira-client' {
    interface JiraApiOptions {
        protocol?: string;
        host: string;
        base?: string;
        username?: string;
        password?: string;
        apiVersion?: string;
        strictSSL?: boolean;
        oauth?: any;
        headers?: Record<string, string>;
        customHeaders?: Record<string, string>;
    }

    class JiraApi {
        constructor(options: JiraApiOptions);

        // User
        getCurrentUser(): Promise<any>;

        // Boards
        getAllBoards(startAt?: number, maxResults?: number, type?: string, name?: string, projectKeyOrId?: string): Promise<{ values: any[] }>;
        getBoard(boardId: number): Promise<any>;

        // Sprints
        getAllSprints(boardId: number, startAt?: number, maxResults?: number, state?: string): Promise<{ values: any[] }>;
        getSprint(sprintId: number): Promise<any>;
        getSprintIssues(sprintId: number, startAt?: number, maxResults?: number, jql?: string): Promise<{ issues: any[] }>;

        // Issues
        getIssue(issueKey: string, fields?: string[], expand?: string): Promise<any>;
        updateIssue(issueKey: string, issueUpdate: any): Promise<any>;
        updateAssignee(issueKey: string, accountId: string): Promise<any>;
        addComment(issueKey: string, comment: string): Promise<any>;
        searchJira(jql: string, options?: { maxResults?: number, startAt?: number, fields?: string[], expand?: string[] }): Promise<{ issues: any[], startAt: number, maxResults: number, total: number }>;

        // Projects
        listProjects(): Promise<any[]>;
    }

    export = JiraApi;
}
