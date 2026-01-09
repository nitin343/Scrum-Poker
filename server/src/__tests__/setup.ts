import { beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables for tests
dotenv.config();

// Set the JWT secret for tests to match the development fallback
// This ensures tests can verify JWT tokens correctly
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-do-not-use-in-production';
process.env.NODE_ENV = 'test';

beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri && mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoUri);
    }
});

afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
});
