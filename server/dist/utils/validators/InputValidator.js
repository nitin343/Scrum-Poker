"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateObject = exports.validateNumber = exports.validateString = exports.validateRequired = exports.validatePassword = exports.validateEmail = void 0;
const AppError_1 = require("../errors/AppError");
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const validatePassword = (password) => {
    return password.length >= 8;
};
exports.validatePassword = validatePassword;
const validateRequired = (value, fieldName) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
        throw (0, AppError_1.createValidationError)(`${fieldName} is required`);
    }
};
exports.validateRequired = validateRequired;
const validateString = (value, fieldName, minLength, maxLength) => {
    if (typeof value !== 'string') {
        throw (0, AppError_1.createValidationError)(`${fieldName} must be a string`);
    }
    if (minLength && value.length < minLength) {
        throw (0, AppError_1.createValidationError)(`${fieldName} must be at least ${minLength} characters`);
    }
    if (maxLength && value.length > maxLength) {
        throw (0, AppError_1.createValidationError)(`${fieldName} must be at most ${maxLength} characters`);
    }
};
exports.validateString = validateString;
const validateNumber = (value, fieldName, min, max) => {
    if (typeof value !== 'number') {
        throw (0, AppError_1.createValidationError)(`${fieldName} must be a number`);
    }
    if (min !== undefined && value < min) {
        throw (0, AppError_1.createValidationError)(`${fieldName} must be at least ${min}`);
    }
    if (max !== undefined && value > max) {
        throw (0, AppError_1.createValidationError)(`${fieldName} must be at most ${max}`);
    }
};
exports.validateNumber = validateNumber;
const validateObject = (value, fieldName, requiredKeys) => {
    if (typeof value !== 'object' || value === null) {
        throw (0, AppError_1.createValidationError)(`${fieldName} must be an object`);
    }
    for (const key of requiredKeys) {
        if (!(key in value)) {
            throw (0, AppError_1.createValidationError)(`${fieldName}.${key} is required`);
        }
    }
};
exports.validateObject = validateObject;
