"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Constants = void 0;
exports.Constants = {
    APP_NAME: 'Scrum Poker Pro',
    VERSION: '1.0.0',
    ENVIRONMENT: {
        DEV: 'development',
        PROD: 'production',
        TEST: 'test'
    },
    DEFAULT_PORTS: {
        SERVER: 3001,
        CLIENT: 5173
    },
    JWT: {
        DEFAULT_EXPIRY: '7d',
        ALGORITHM: 'HS256'
    },
    BCRYPT: {
        ROUNDS: 12
    },
    VALIDATION: {
        MIN_PASSWORD_LENGTH: 8,
        MIN_EMAIL_LENGTH: 5,
        MAX_EMAIL_LENGTH: 255,
        MAX_DISPLAY_NAME_LENGTH: 100
    },
    WEBSOCKET: {
        ROOMS_PREFIX: 'room:',
        USER_JOINED: 'user:joined',
        USER_LEFT: 'user:left',
        VOTE_SUBMITTED: 'vote:submitted',
        CARDS_REVEALED: 'cards:revealed',
        ROUND_RESET: 'round:reset'
    },
    JIRA: {
        API_VERSION: '2',
        DEFAULT_TIMEOUT: 10000,
        RETRY_ATTEMPTS: 3
    },
    HTTP_STATUS: {
        OK: 200,
        CREATED: 201,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        INTERNAL_SERVER_ERROR: 500,
        SERVICE_UNAVAILABLE: 503
    }
};
