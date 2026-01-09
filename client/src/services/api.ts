const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        type: string;
        message: string;
        statusCode: number;
    };
}

class ApiClient {
    private baseUrl = API_BASE;

    async get<T>(endpoint: string, token?: string): Promise<ApiResponse<T>> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            headers
        });
        return response.json();
    }

    async post<T>(endpoint: string, data?: any, token?: string): Promise<ApiResponse<T>> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers,
            body: data ? JSON.stringify(data) : undefined
        });
        return response.json();
    }

    async put<T>(endpoint: string, data: any, token?: string): Promise<ApiResponse<T>> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(data)
        });
        return response.json();
    }

    async delete<T>(endpoint: string, token?: string): Promise<ApiResponse<T>> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'DELETE',
            headers
        });
        return response.json();
    }
}

export const apiClient = new ApiClient();
