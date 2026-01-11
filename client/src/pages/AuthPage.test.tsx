import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthPage } from './AuthPage';
import { AuthProvider } from '../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import { api } from '../services/api';

// Mock API
vi.mock('../services/api', () => ({
    api: {
        auth: {
            login: vi.fn(),
            signup: vi.fn(),
        }
    }
}));

const renderAuthPage = () => {
    render(
        <BrowserRouter>
            <AuthProvider>
                <AuthPage />
            </AuthProvider>
        </BrowserRouter>
    );
};

describe('AuthPage', () => {
    it('renders login form by default', () => {
        renderAuthPage();
        expect(screen.getByText('Welcome Back')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
        expect(screen.queryByPlaceholderText('Scrum Master Name')).not.toBeInTheDocument();
    });

    it('toggles to signup form', () => {
        renderAuthPage();
        fireEvent.click(screen.getByText("Don't have an account? Join your team"));

        expect(screen.getByText('Join the Team')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Scrum Master Name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('XYZ-123')).toBeInTheDocument();
    });

    it('handles login submission', async () => {
        const mockLogin = vi.mocked(api.auth.login).mockResolvedValue({
            token: 'fake-token',
            user: { id: '1', displayName: 'Test' },
            inviteCode: 'CODE'
        });

        renderAuthPage();

        fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'test@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password' } });
        fireEvent.click(screen.getByText('Sign In'));

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'password');
        });
    });

    it('handles signup submission', async () => {
        const mockSignup = vi.mocked(api.auth.signup).mockResolvedValue({
            token: 'fake-token',
            user: { id: '1', displayName: 'New User' },
            inviteCode: 'NEWCODE'
        });

        renderAuthPage();
        // Switch to signup
        fireEvent.click(screen.getByText("Don't have an account? Join your team"));

        fireEvent.change(screen.getByPlaceholderText('Scrum Master Name'), { target: { value: 'New User' } });
        fireEvent.change(screen.getByPlaceholderText('XYZ-123'), { target: { value: 'INVITE' } });
        fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'new@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });

        fireEvent.click(screen.getByText('Create Account'));

        await waitFor(() => {
            expect(mockSignup).toHaveBeenCalledWith('new@test.com', 'password123', 'New User', 'INVITE');
        });
    });
});
