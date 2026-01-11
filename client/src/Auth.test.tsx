import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthPage } from './pages/AuthPage';
import { AuthProvider } from './context/AuthContext';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api } from './services/api';

// Mock API
vi.mock('./services/api', () => ({
    api: {
        auth: {
            login: vi.fn(),
            signup: vi.fn(),
        }
    }
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('AuthPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('renders login form by default', () => {
        render(
            <AuthProvider>
                <MemoryRouter>
                    <AuthPage />
                </MemoryRouter>
            </AuthProvider>
        );
        expect(screen.getByText('Welcome Back')).toBeInTheDocument();
        expect(screen.getByText('Sign In')).toBeInTheDocument();
        expect(screen.queryByPlaceholderText('Scrum Master Name')).not.toBeInTheDocument();
    });

    it('switches to signup form', () => {
        render(
            <AuthProvider>
                <MemoryRouter>
                    <AuthPage />
                </MemoryRouter>
            </AuthProvider>
        );

        fireEvent.click(screen.getByText("Don't have an account? Join your team"));

        expect(screen.getByText('Join the Team')).toBeInTheDocument();
        expect(screen.getByText('Create Account')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Scrum Master Name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('XYZ-123')).toBeInTheDocument();
    });

    it('handles login failure', async () => {
        (api.auth.login as any).mockRejectedValue(new Error('Invalid credentials'));

        render(
            <AuthProvider>
                <MemoryRouter>
                    <AuthPage />
                </MemoryRouter>
            </AuthProvider>
        );

        fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'test@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrongpass' } });
        fireEvent.click(screen.getByText('Sign In'));

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
        });
    });

    it('handles successful login', async () => {
        (api.auth.login as any).mockResolvedValue({
            token: 'valid-token',
            user: { id: '1', displayName: 'Test User' },
            inviteCode: 'TEST'
        });

        render(
            <AuthProvider>
                <MemoryRouter>
                    <AuthPage />
                </MemoryRouter>
            </AuthProvider>
        );

        fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'test@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password' } });
        fireEvent.click(screen.getByText('Sign In'));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        });
    });

    it('handles successful signup', async () => {
        (api.auth.signup as any).mockResolvedValue({
            token: 'new-token',
            user: { id: '2', displayName: 'New User' },
            inviteCode: 'NEW123'
        });

        render(
            <AuthProvider>
                <MemoryRouter>
                    <AuthPage />
                </MemoryRouter>
            </AuthProvider>
        );

        // Switch to signup
        fireEvent.click(screen.getByText("Don't have an account? Join your team"));

        fireEvent.change(screen.getByPlaceholderText('Scrum Master Name'), { target: { value: 'New User' } });
        fireEvent.change(screen.getByPlaceholderText('XYZ-123'), { target: { value: 'INVITE' } });
        fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'new@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password' } });

        fireEvent.click(screen.getByText('Create Account'));

        await waitFor(() => {
            expect(api.auth.signup).toHaveBeenCalledWith('new@test.com', 'password', 'New User', 'INVITE');
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        });
    });
});
