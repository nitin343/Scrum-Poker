import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatBubble } from '../ChatBubble';

describe('ChatBubble', () => {
    it('should render user message', () => {
        render(
            <ChatBubble
                sender="user"
                userName="John Doe"
                message="What is story point 5?"
                timestamp={new Date('2024-01-01T12:00:00Z')}
            />
        );

        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('What is story point 5?')).toBeInTheDocument();
    });

    it('should render AI message', () => {
        render(
            <ChatBubble
                sender="ai"
                message="Story point 5 represents medium complexity..."
                timestamp={new Date('2024-01-01T12:00:00Z')}
            />
        );

        expect(screen.getByText(/Story point 5/)).toBeInTheDocument();
    });

    it('should apply correct styling for user messages', () => {
        const { container } = render(
            <ChatBubble
                sender="user"
                userName="John"
                message="Test"
                timestamp={new Date()}
            />
        );

        const bubble = container.querySelector('.chat-bubble');
        expect(bubble).toHaveClass('user');
    });

    it('should apply correct styling for AI messages', () => {
        const { container } = render(
            <ChatBubble
                sender="ai"
                message="Test"
                timestamp={new Date()}
            />
        );

        const bubble = container.querySelector('.chat-bubble');
        expect(bubble).toHaveClass('ai');
    });

    it('should display timestamp', () => {
        const timestamp = new Date('2024-01-01T12:30:00Z');
        render(
            <ChatBubble
                sender="user"
                userName="John"
                message="Test"
                timestamp={timestamp}
            />
        );

        // Should display time (format may vary by locale)
        const timeElement = screen.getByText(/\d{1,2}:\d{2}/);
        expect(timeElement).toBeInTheDocument();
    });

    it('should show AI avatar for AI messages', () => {
        render(
            <ChatBubble
                sender="ai"
                message="Test"
                timestamp={new Date()}
            />
        );

        expect(screen.getByText('🤖')).toBeInTheDocument();
    });

    it('should show user avatar for user messages', () => {
        render(
            <ChatBubble
                sender="user"
                userName="John"
                message="Test"
                timestamp={new Date()}
            />
        );

        expect(screen.getByText('👤')).toBeInTheDocument();
    });
});
