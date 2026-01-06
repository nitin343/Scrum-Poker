
import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { setupSocket } from './socket';

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';

const io = new Server(server, {
    cors: {
        origin: allowedOrigin,
        methods: ['GET', 'POST']
    }
});

// Setup Socket.io logic
setupSocket(io);

app.get('/', (req, res) => {
    res.send('Scrum Poker Server is running');
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
