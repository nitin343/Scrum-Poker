"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.handleError = void 0;
const AppError_1 = require("./AppError");
const handleError = (error, res) => {
    const timestamp = new Date().toISOString();
    if (error instanceof AppError_1.AppError) {
        const response = {
            success: false,
            error: {
                type: error.constructor.name,
                message: error.message,
                statusCode: error.statusCode,
                timestamp
            }
        };
        res.status(error.statusCode).json(response);
    }
    else if (error instanceof Error) {
        const response = {
            success: false,
            error: {
                type: 'InternalError',
                message: process.env.NODE_ENV === 'production'
                    ? 'An unexpected error occurred'
                    : error.message,
                statusCode: 500,
                timestamp
            }
        };
        res.status(500).json(response);
    }
    else {
        res.status(500).json({
            success: false,
            error: {
                type: 'UnknownError',
                message: 'An unexpected error occurred',
                statusCode: 500,
                timestamp
            }
        });
    }
};
exports.handleError = handleError;
const asyncHandler = (fn) => (...args) => Promise.resolve(fn(...args)).catch(args[args.length - 1]);
exports.asyncHandler = asyncHandler;
