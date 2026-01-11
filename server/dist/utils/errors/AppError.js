"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInternalError = exports.createConflictError = exports.createNotFoundError = exports.createForbiddenError = exports.createAuthError = exports.createValidationError = exports.ErrorCodes = exports.ErrorTypes = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
exports.ErrorTypes = {
    VALIDATION_ERROR: 'ValidationError',
    AUTHENTICATION_ERROR: 'AuthenticationError',
    AUTHORIZATION_ERROR: 'AuthorizationError',
    NOT_FOUND_ERROR: 'NotFoundError',
    CONFLICT_ERROR: 'ConflictError',
    INTERNAL_ERROR: 'InternalError',
    SERVICE_ERROR: 'ServiceError'
};
exports.ErrorCodes = {
    INVALID_INPUT: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
};
const createValidationError = (message) => new AppError(message, exports.ErrorCodes.INVALID_INPUT);
exports.createValidationError = createValidationError;
const createAuthError = (message) => new AppError(message, exports.ErrorCodes.UNAUTHORIZED);
exports.createAuthError = createAuthError;
const createForbiddenError = (message) => new AppError(message, exports.ErrorCodes.FORBIDDEN);
exports.createForbiddenError = createForbiddenError;
const createNotFoundError = (message) => new AppError(message, exports.ErrorCodes.NOT_FOUND);
exports.createNotFoundError = createNotFoundError;
const createConflictError = (message) => new AppError(message, exports.ErrorCodes.CONFLICT);
exports.createConflictError = createConflictError;
const createInternalError = (message) => new AppError(message, exports.ErrorCodes.INTERNAL_SERVER_ERROR);
exports.createInternalError = createInternalError;
