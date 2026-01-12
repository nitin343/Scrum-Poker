import ChatMessage from '../models/ChatMessage';
import { logger } from '../utils/logger/Logger';

interface PendingMessage {
    message: string;
    userId: string;
    userName: string;
    timestamp: Date;
}

interface Batch {
    messages: PendingMessage[];
    timer: NodeJS.Timeout | null;
    resolvers: Array<(value: string) => void>;
}

export class MessageBatcher {
    private batches: Map<string, Batch> = new Map();
    private readonly BATCH_SIZE = 5;
    private readonly BATCH_TIMEOUT = 2000; // 2 seconds
    private readonly CONTEXT_SIZE = 10; // Last 10 messages for context
    private historyProvider: ((roomId: string) => Promise<any[]>) | null = null;

    constructor(private aiService: any) { }

    /**
     * Set history provider (for testing)
     */
    setHistoryProvider(provider: (roomId: string) => Promise<any[]>) {
        this.historyProvider = provider;
    }

    /**
     * Add message to batch and return AI response
     */
    async addMessage(
        roomId: string,
        message: string,
        userId: string,
        userName: string
    ): Promise<string> {
        return new Promise((resolve) => {
            // Get or create batch for room
            if (!this.batches.has(roomId)) {
                this.batches.set(roomId, {
                    messages: [],
                    timer: null,
                    resolvers: []
                });
            }

            const batch = this.batches.get(roomId)!;

            // Add message to batch
            batch.messages.push({
                message,
                userId,
                userName,
                timestamp: new Date()
            });
            batch.resolvers.push(resolve);
            logger.debug(`[MessageBatcher] Added message from ${userName} to batch for ${roomId}. Count: ${batch.messages.length}`);

            // Clear existing timer
            if (batch.timer) {
                clearTimeout(batch.timer);
            }

            // If batch is full, process immediately
            if (batch.messages.length >= this.BATCH_SIZE) {
                logger.debug(`[MessageBatcher] Batch full for ${roomId}, processing immediately.`);
                this.processBatch(roomId);
            } else {
                // Otherwise, set timeout
                batch.timer = setTimeout(() => {
                    logger.debug(`[MessageBatcher] Batch timer expired for ${roomId}, processing.`);
                    this.processBatch(roomId);
                }, this.BATCH_TIMEOUT);
            }
        });
    }

    /**
     * Process batch and call AI service
     */
    private async processBatch(roomId: string): Promise<void> {
        const batch = this.batches.get(roomId);
        if (!batch || batch.messages.length === 0) return;

        // Clear timer
        if (batch.timer) {
            clearTimeout(batch.timer);
            batch.timer = null;
        }

        // Get messages and resolvers
        const messages = [...batch.messages];
        const resolvers = [...batch.resolvers];
        logger.debug(`[MessageBatcher] Processing batch of ${messages.length} messages for ${roomId}`);

        // Clear batch
        batch.messages = [];
        batch.resolvers = [];

        try {
            // Get message history for context
            const history = await this.getMessageHistory(roomId);

            // Combine history + new messages
            const allMessages = [
                ...history.slice(-this.CONTEXT_SIZE), // Last 10 messages
                ...messages.map(m => ({
                    sender: 'user' as const,
                    message: m.message,
                    timestamp: m.timestamp
                }))
            ];

            // Call AI service
            logger.debug(`[MessageBatcher] Calling AI Service with ${allMessages.length} total messages in context...`);
            const response = await this.aiService.chatWithContext(allMessages, roomId);
            logger.debug(`[MessageBatcher] AI Service responded: ${response ? 'Success' : 'Null'}`);

            // Resolve all promises with same response
            resolvers.forEach(resolve => resolve(response));

        } catch (error) {
            logger.error('MessageBatcher error:', error);
            // Resolve with error message
            resolvers.forEach(resolve => resolve('Sorry, I encountered an error. Please try again.'));
        }
    }

    /**
     * Get message history from database
     */
    private async getMessageHistory(roomId: string): Promise<any[]> {
        // Use test provider if available
        if (this.historyProvider) {
            return this.historyProvider(roomId);
        }

        // Otherwise query database
        try {
            const messages = await ChatMessage.find({ roomId })
                .sort({ timestamp: -1 })
                .limit(this.CONTEXT_SIZE);

            return messages.reverse(); // Oldest first
        } catch (error) {
            logger.error('Error fetching message history:', error);
            return [];
        }
    }

    /**
     * Get current batches (for testing)
     */
    getBatches(): Map<string, PendingMessage[]> {
        const result = new Map<string, PendingMessage[]>();
        this.batches.forEach((batch, roomId) => {
            result.set(roomId, batch.messages);
        });
        return result;
    }

    /**
     * Clear all batches (for cleanup)
     */
    clearAll(): void {
        this.batches.forEach(batch => {
            if (batch.timer) clearTimeout(batch.timer);
        });
        this.batches.clear();
    }
}
