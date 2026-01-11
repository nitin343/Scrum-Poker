import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { ReactNode } from 'react';

// Mock component to consume context
const TestComponent = () => {
    const { user, login, logout, isAuthenticated } = useAuth();
    return (
        <div>
            <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Guest'}</div>
            {user && <div data-testid="user-name">{user.displayName}</div>}
            <button onClick={() => login('test-token', { id: '1', email: 'test@test.com', displayName: 'Test User', companyId: 'c1' })}>Login</button>
            <button onClick={logout}>Logout</button>
        </div>
    );
};

describe('AuthContext', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('provides initial unauthenticated state', () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Guest');
    });

    it('updates state on login', async () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        fireEvent.click(screen.getByText('Login'));

        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
        expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
        expect(localStorage.getItem('token')).toBe('test-token');
    });

    it('updates state on logout', async () => {
        localStorage.setItem('token', 'old-token');
        localStorage.setItem('user', JSON.stringify({ id: '1', displayName: 'Old User' }));

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        // Initial state should be authenticated (from localStorage)
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');

        fireEvent.click(screen.getByText('Logout'));

        expect(screen.getByTestId('auth-status')).toHaveTextContent('Guest');
        expect(localStorage.getItem('token')).toBeNull();
    });
});
