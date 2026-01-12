const API_BASE = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001/api/v1';

if (import.meta.env.PROD && API_BASE.includes('localhost')) {
    console.error('🚨 CRITICAL CONFIG ERROR: Production app is trying to connect to localhost. You must set VITE_SERVER_URL in your Vercel Environment Variables.');
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        // Handle nested error object (e.g., { error: { message: "..." } })
        let errorMessage = 'API Request Failed';
        if (typeof data.error === 'string') {
            errorMessage = data.error;
        } else if (data.error?.message) {
            errorMessage = data.error.message;
        } else if (data.message) {
            errorMessage = data.message;
        }
        throw new Error(errorMessage);
    }

    return data;
}

export const api = {
    auth: {
        login: async (email: string, password: string) => {
            return fetchWithAuth('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
        },
        signup: async (email: string, password: string, displayName: string, inviteCode: string) => {
            return fetchWithAuth('/auth/signup', {
                method: 'POST',
                body: JSON.stringify({ email, password, displayName, inviteCode }),
            });
        },
        validateInvite: async (inviteCode: string) => {
            return fetchWithAuth('/auth/validate-invite', {
                method: 'POST',
                body: JSON.stringify({ inviteCode }),
            });
        },
        getMe: async () => {
            return fetchWithAuth('/auth/me');
        }
    },
    jira: {
        getBoards: async () => {
            return fetchWithAuth('/jira/boards');
        },
        getSprints: async (boardId: number | string) => {
            return fetchWithAuth(`/jira/boards/${boardId}/sprints`);
        },
        getSprintIssues: async (_boardId: number | string, sprintId: number | string) => {
            // Note: boardId is kept for interface compatibility but not used in the path
            return fetchWithAuth(`/jira/sprints/${sprintId}/issues`);
        },
        getIssue: async (issueKey: string) => {
            return fetchWithAuth(`/jira/issues/${issueKey}`);
        },
        updateIssuePoints: async (issueKey: string, points: string | number, issueType: string, votingResults?: any, sprintId?: string) => {
            return fetchWithAuth(`/jira/issues/${issueKey}/points`, {
                method: 'PUT',
                body: JSON.stringify({ points, issueType, votingResults, sprintId })
            });
        }
    },
    sprints: {
        get: async (sprintId: string) => {
            return fetchWithAuth(`/sprints/${sprintId}`);
        },
        syncJira: async (sprintId: string, payload: { boardId: string, sprintName?: string, issues: any[], jiraState: string }) => {
            return fetchWithAuth(`/sprints/${sprintId}/sync-jira`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        },
        enable: async (sprintId: string) => {
            return fetchWithAuth(`/sprints/${sprintId}/enable`, { method: 'PATCH' });
        },
        disable: async (sprintId: string) => {
            return fetchWithAuth(`/sprints/${sprintId}/disable`, { method: 'PATCH' });
        },
        updateCurrentIssue: async (sprintId: string, issueIndex: number) => {
            return fetchWithAuth(`/sprints/${sprintId}/current-issue`, {
                method: 'PATCH',
                body: JSON.stringify({ issueIndex })
            });
        }
    },
    sessions: {
        create: async (payload: any) => {
            return fetchWithAuth('/sessions', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
        },
        getAll: async () => {
            return fetchWithAuth('/sessions');
        },
        get: async (sessionId: string, token?: string) => {
            const url = token ? `/sessions/${sessionId}?token=${token}` : `/sessions/${sessionId}`;
            return fetchWithAuth(url);
        },
        delete: async (sessionId: string) => {
            return fetchWithAuth(`/sessions/${sessionId}`, {
                method: 'DELETE',
            });
        }
    },
    ai: {
        getBoardContext: async (boardId: string) => {
            return fetchWithAuth(`/ai/boards/${boardId}/context`);
        },
        saveBoardContext: async (boardId: string, payload: { projectContext: string, backendRepoUrl: string, frontendRepoUrl: string }) => {
            return fetchWithAuth(`/ai/boards/${boardId}/context`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        },
        analyzeCodebase: async (boardId: string) => {
            return fetchWithAuth(`/ai/boards/${boardId}/analyze`, {
                method: 'POST'
            });
        }
    }
};
