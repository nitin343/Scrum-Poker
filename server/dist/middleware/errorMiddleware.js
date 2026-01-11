"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = void 0;
const AppError_1 = require("../utils/errors/AppError");
const ErrorHandler_1 = require("../utils/errors/ErrorHandler");
const Logger_1 = require("../utils/logger/Logger");
const errorHandler = (err, req, res, next) => {
    Logger_1.logger.error('Error caught by error handler', err);
    if (err instanceof AppError_1.AppError) {
        (0, ErrorHandler_1.handleError)(err, res);
    }
    else if (err instanceof SyntaxError) {
        const validationError = new AppError_1.AppError('Invalid JSON', AppError_1.ErrorCodes.INVALID_INPUT);
        (0, ErrorHandler_1.handleError)(validationError, res);
    }
    else {
        const internalError = new AppError_1.AppError(process.env.NODE_ENV === 'production'
            ? 'Internal Server Error'
            : err.message, AppError_1.ErrorCodes.INTERNAL_SERVER_ERROR);
        (0, ErrorHandler_1.handleError)(internalError, res);
    }
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res, next) => {
    const error = new AppError_1.AppError(`Route not found: ${req.method} ${req.path}`, AppError_1.ErrorCodes.NOT_FOUND);
    (0, ErrorHandler_1.handleError)(error, res);
};
exports.notFoundHandler = notFoundHandler;
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
