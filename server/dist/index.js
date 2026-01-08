"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const socket_io_1 = require("socket.io");
const socket_1 = require("./socket");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
const io = new socket_io_1.Server(server, {
    cors: {
        origin: allowedOrigin,
        methods: ['GET', 'POST']
    }
});
// Setup Socket.io logic
(0, socket_1.setupSocket)(io);
app.get('/', (req, res) => {
    res.send('Scrum Poker Server is running');
});
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
