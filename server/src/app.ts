import express from 'express';
import cors from 'cors';
import apiV1Routes from './api/v1/routes';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware';

const app = express();

app.use(cors());
app.use(express.json());

// API v1 routes
app.use('/api/v1', apiV1Routes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.send('Scrum Poker Server is running');
});

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
