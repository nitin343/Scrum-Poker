import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '../ChatInput';

describe('ChatInput', () => {
    it('should render input field', () => {
        render(<ChatInput onSend={vi.fn()} disabled={false} />);

        const input = screen.getByPlaceholderText(/ask ai/i);
        expect(input).toBeInTheDocument();
    });

    it('should call onSend when send button clicked', () => {
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} disabled={false} />);

        const input = screen.getByPlaceholderText(/ask ai/i);
        const sendButton = screen.getByRole('button', { name: /send/i });

        fireEvent.change(input, { target: { value: 'Test message' } });
        fireEvent.click(sendButton);

        expect(onSend).toHaveBeenCalledWith('Test message');
    });

    it('should call onSend when Enter key pressed', () => {
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} disabled={false} />);

        const input = screen.getByPlaceholderText(/ask ai/i);

        fireEvent.change(input, { target: { value: 'Test message' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        expect(onSend).toHaveBeenCalledWith('Test message');
    });

    it('should clear input after sending', () => {
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} disabled={false} />);

        const input = screen.getByPlaceholderText(/ask ai/i) as HTMLInputElement;

        fireEvent.change(input, { target: { value: 'Test message' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        expect(input.value).toBe('');
    });

    it('should not send empty messages', () => {
        const onSend = vi.fn();
        render(<ChatInput onSend={onSend} disabled={false} />);

        const sendButton = screen.getByRole('button', { name: /send/i });
        fireEvent.click(sendButton);

        expect(onSend).not.toHaveBeenCalled();
    });

    it('should disable input when disabled prop is true', () => {
        render(<ChatInput onSend={vi.fn()} disabled={true} />);

        const input = screen.getByPlaceholderText(/ask ai/i);
        expect(input).toBeDisabled();
    });

    it('should disable send button when disabled prop is true', () => {
        render(<ChatInput onSend={vi.fn()} disabled={true} />);

        const sendButton = screen.getByRole('button', { name: /send/i });
        expect(sendButton).toBeDisabled();
    });
});
