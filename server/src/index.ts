import http from 'http';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { app } from './app';
import { setupSocket } from './socket';
import connectDB from './db/connection';
import { jiraService } from './services/JiraService';
import { logger } from './utils/logger/Logger';
import { Constants } from './utils/constants';

dotenv.config();

const server = http.createServer(app);

const allowedOrigin = [
    process.env.ALLOWED_ORIGIN || '*',
    'https://scrum-poker-sand.vercel.app',
    'http://localhost:5173'
];

const io = new Server(server, {
    cors: {
        origin: allowedOrigin,
        methods: ['GET', 'POST']
    },
    pingTimeout: 600000, // 10 minutes
    pingInterval: 25000
});

setupSocket(io);

const PORT = process.env.PORT || Constants.DEFAULT_PORTS.SERVER;

const startServer = async () => {
    try {
        await connectDB();
        logger.success('MongoDB connected successfully');

        logger.info('Initializing Jira Integration...');
        jiraService.initClient();

        server.listen(PORT, () => {
            logger.success(`Server running on port ${PORT}`);
        });

        logger.info('Testing Jira Connection...');
        // Run test in background so it doesn't block startup (especially if waiting 30s)
        jiraService.testConnection().then(jiraResult => {
            if (jiraResult.success) {
                logger.success(`Jira Connection: ${jiraResult.message}`);
            } else {
                logger.warn(`Jira Connection: ${jiraResult.message}`);
            }
        });
    } catch (error) {
        logger.error('Failed to start server', error);
        process.exit(1);
    }
};

startServer();