export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number = 500,
        public isOperational: boolean = true
    ) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export const ErrorTypes = {
    VALIDATION_ERROR: 'ValidationError',
    AUTHENTICATION_ERROR: 'AuthenticationError',
    AUTHORIZATION_ERROR: 'AuthorizationError',
    NOT_FOUND_ERROR: 'NotFoundError',
    CONFLICT_ERROR: 'ConflictError',
    INTERNAL_ERROR: 'InternalError',
    SERVICE_ERROR: 'ServiceError'
} as const;

export const ErrorCodes = {
    INVALID_INPUT: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
} as const;

export const createValidationError = (message: string) => 
    new AppError(message, ErrorCodes.INVALID_INPUT);

export const createAuthError = (message: string) => 
    new AppError(message, ErrorCodes.UNAUTHORIZED);

export const createForbiddenError = (message: string) => 
    new AppError(message, ErrorCodes.FORBIDDEN);

export const createNotFoundError = (message: string) => 
    new AppError(message, ErrorCodes.NOT_FOUND);

export const createConflictError = (message: string) => 
    new AppError(message, ErrorCodes.CONFLICT);

export const createInternalError = (message: string) => 
    new AppError(message, ErrorCodes.INTERNAL_SERVER_ERROR);
