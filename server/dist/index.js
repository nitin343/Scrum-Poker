"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const dotenv_1 = __importDefault(require("dotenv"));
const socket_io_1 = require("socket.io");
const app_1 = require("./app");
const socket_1 = require("./socket");
const connection_1 = __importDefault(require("./db/connection"));
const JiraService_1 = require("./services/JiraService");
const Logger_1 = require("./utils/logger/Logger");
const constants_1 = require("./utils/constants");
dotenv_1.default.config();
const server = http_1.default.createServer(app_1.app);
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
const io = new socket_io_1.Server(server, {
    cors: {
        origin: allowedOrigin,
        methods: ['GET', 'POST']
    }
});
(0, socket_1.setupSocket)(io);
const PORT = process.env.PORT || constants_1.Constants.DEFAULT_PORTS.SERVER;
const startServer = async () => {
    try {
        await (0, connection_1.default)();
        Logger_1.logger.success('MongoDB connected successfully');
        Logger_1.logger.info('Initializing Jira Integration...');
        JiraService_1.jiraService.initClient();
        server.listen(PORT, () => {
            Logger_1.logger.success(`Server running on port ${PORT}`);
        });
        Logger_1.logger.info('Testing Jira Connection...');
        // Run test in background so it doesn't block startup (especially if waiting 30s)
        JiraService_1.jiraService.testConnection().then(jiraResult => {
            if (jiraResult.success) {
                Logger_1.logger.success(`Jira Connection: ${jiraResult.message}`);
            }
            else {
                Logger_1.logger.warn(`Jira Connection: ${jiraResult.message}`);
            }
        });
    }
    catch (error) {
        Logger_1.logger.error('Failed to start server', error);
        process.exit(1);
    }
};
startServer();
