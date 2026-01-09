export class Logger {
    private prefix = '[Scrum-Poker]';

    info(message: string, data?: any): void {
        const log = {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            message,
            data
        };
        console.log(JSON.stringify(log));
    }

    warn(message: string, data?: any): void {
        const log = {
            timestamp: new Date().toISOString(),
            level: 'WARN',
            message,
            data
        };
        console.warn(JSON.stringify(log));
    }

    error(message: string, error?: any, data?: any): void {
        const log = {
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            message,
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            data
        };
        console.error(JSON.stringify(log));
    }

    debug(message: string, data?: any): void {
        if (process.env.NODE_ENV === 'development') {
            const log = {
                timestamp: new Date().toISOString(),
                level: 'DEBUG',
                message,
                data
            };
            console.debug(JSON.stringify(log));
        }
    }

    success(message: string, data?: any): void {
        const log = {
            timestamp: new Date().toISOString(),
            level: 'SUCCESS',
            message,
            data
        };
        console.log(JSON.stringify(log));
    }
}

export const logger = new Logger();
