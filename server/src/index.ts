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

const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';

const io = new Server(server, {
    cors: {
        origin: allowedOrigin,
        methods: ['GET', 'POST']
    }
});

setupSocket(io);

const PORT = process.env.PORT || Constants.DEFAULT_PORTS.SERVER;

const startServer = async () => {
    try {
        await connectDB();
        logger.success('MongoDB connected successfully');

        logger.info('Initializing Jira Integration...');
        jiraService.initClient();

        logger.info('Testing Jira Connection...');
        const jiraResult = await jiraService.testConnection();
        
        if (jiraResult.success) {
            logger.success(`Jira Connection: ${jiraResult.message}`);
        } else {
            logger.warn(`Jira Connection: ${jiraResult.message}`);
        }

        server.listen(PORT, () => {
            logger.success(`Server running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server', error);
        process.exit(1);
    }
};

startServer();