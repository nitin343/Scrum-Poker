"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = void 0;
class Logger {
    constructor() {
        this.prefix = '[Scrum-Poker]';
    }
    info(message, data) {
        const log = {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            message,
            data
        };
        console.log(JSON.stringify(log));
    }
    warn(message, data) {
        const log = {
            timestamp: new Date().toISOString(),
            level: 'WARN',
            message,
            data
        };
        console.warn(JSON.stringify(log));
    }
    error(message, error, data) {
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
    debug(message, data) {
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
    success(message, data) {
        const log = {
            timestamp: new Date().toISOString(),
            level: 'SUCCESS',
            message,
            data
        };
        console.log(JSON.stringify(log));
    }
}
exports.Logger = Logger;
exports.logger = new Logger();
