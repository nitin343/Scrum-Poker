/**
 * Token Bucket Rate Limiter
 * Ensures API requests stay within rate limits (e.g., 30 req/min for Siemens LLM)
 */
export class RateLimiter {
    private tokens: number;
    private lastRefill: number;
    private queue: Array<{ resolve: () => void; reject: (error: Error) => void; timestamp: number }> = [];
    private processing = false;

    constructor(
        private maxTokens: number,      // Max requests allowed
        private refillInterval: number,  // Time window in ms (e.g., 60000 for 1 minute)
        private maxQueueSize: number = 10 // Max pending requests
    ) {
        this.tokens = maxTokens;
        this.lastRefill = Date.now();
    }

    /**
     * Refill tokens based on elapsed time
     */
    private refill(): void {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        const tokensToAdd = (elapsed / this.refillInterval) * this.maxTokens;

        this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
        this.lastRefill = now;
    }

    /**
     * Acquire a token (wait if none available)
     * @returns Promise that resolves when token is acquired
     */
    async acquire(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Check if queue is full
            if (this.queue.length >= this.maxQueueSize) {
                reject(new Error('Rate limiter queue is full. Please try again later.'));
                return;
            }

            // Add to queue
            this.queue.push({ resolve, reject, timestamp: Date.now() });
            this.processQueue();
        });
    }

    /**
     * Process queued requests
     */
    private processQueue(): void {
        if (this.processing) return;
        this.processing = true;

        const processNext = () => {
            // Refill tokens
            this.refill();

            // Process queue
            while (this.queue.length > 0 && this.tokens >= 1) {
                const request = this.queue.shift();
                if (!request) break;

                // Check timeout (30 seconds)
                const age = Date.now() - request.timestamp;
                if (age > 30000) {
                    request.reject(new Error('Request timeout: waited too long in queue'));
                    continue;
                }

                // Consume token and resolve
                this.tokens -= 1;
                request.resolve();
            }

            // Schedule next check if queue not empty
            if (this.queue.length > 0) {
                setTimeout(processNext, 100); // Check every 100ms
            } else {
                this.processing = false;
            }
        };

        processNext();
    }

    /**
     * Get current status
     */
    getStatus(): { tokens: number; queueSize: number; maxTokens: number } {
        this.refill();
        return {
            tokens: Math.floor(this.tokens),
            queueSize: this.queue.length,
            maxTokens: this.maxTokens
        };
    }

    /**
     * Clear queue (useful for testing)
     */
    clearQueue(): void {
        this.queue.forEach(req => req.reject(new Error('Queue cleared')));
        this.queue = [];
        this.processing = false;
    }
}
