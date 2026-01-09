import { createValidationError } from '../errors/AppError';

export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
    return password.length >= 8;
};

export const validateRequired = (value: any, fieldName: string): void => {
    if (!value || (typeof value === 'string' && !value.trim())) {
        throw createValidationError(`${fieldName} is required`);
    }
};

export const validateString = (value: any, fieldName: string, minLength?: number, maxLength?: number): void => {
    if (typeof value !== 'string') {
        throw createValidationError(`${fieldName} must be a string`);
    }
    if (minLength && value.length < minLength) {
        throw createValidationError(`${fieldName} must be at least ${minLength} characters`);
    }
    if (maxLength && value.length > maxLength) {
        throw createValidationError(`${fieldName} must be at most ${maxLength} characters`);
    }
};

export const validateNumber = (value: any, fieldName: string, min?: number, max?: number): void => {
    if (typeof value !== 'number') {
        throw createValidationError(`${fieldName} must be a number`);
    }
    if (min !== undefined && value < min) {
        throw createValidationError(`${fieldName} must be at least ${min}`);
    }
    if (max !== undefined && value > max) {
        throw createValidationError(`${fieldName} must be at most ${max}`);
    }
};

export const validateObject = (value: any, fieldName: string, requiredKeys: string[]): void => {
    if (typeof value !== 'object' || value === null) {
        throw createValidationError(`${fieldName} must be an object`);
    }
    for (const key of requiredKeys) {
        if (!(key in value)) {
            throw createValidationError(`${fieldName}.${key} is required`);
        }
    }
};
