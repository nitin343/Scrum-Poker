import express from 'express';
import cors from 'cors';
import apiV1Routes from './api/v1/routes';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));  // Increased for large Jira issue payloads

// API v1 routes
app.use('/api/v1', apiV1Routes);

app.get('/health', async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const dbState = mongoose.connection.readyState;
        const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

        if (dbState !== 1) {
            return res.status(503).json({
                status: 'unhealthy',
                database: dbStatus,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            status: 'healthy',
            database: dbStatus,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/', (req, res) => {
    res.send('Scrum Poker Server is running');
});

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
