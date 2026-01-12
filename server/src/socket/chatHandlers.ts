import { Server, Socket } from 'socket.io';
import { getRoom } from '../store';
import { logger } from '../utils/logger/Logger';
import ChatMessage from '../models/ChatMessage';
import { MessageBatcher } from '../services/MessageBatcher';
import { aiService } from '../services/AIService';

// Singleton batcher instance
const batcher = new MessageBatcher(aiService);

export const setupChatHandlers = (io: Server, socket: Socket) => {
    /**
     * Send chat message
     */
    socket.on('send_chat_message', async ({ roomId, message, userId: payloadUserId, userName: payloadUserName }) => {

        try {
            const room = getRoom(roomId);
            if (!room) {
                logger.warn(`Room ${roomId} NOT FOUND in active rooms list. Triggering error.`);
                socket.emit('error', { message: 'Session expired. Please refresh the page.' });
                return;
            }



            // Find user - Try invalid socket mapping first, then fallback to payload if reliable
            let userId: string | null = null;
            let userName = 'Unknown';

            // 1. Try to find by socket ID (most secure)
            for (const [uid, p] of room.participants.entries()) {
                if (p.socketId === socket.id) {
                    userId = uid;
                    userName = p.displayName;
                    break;
                }
            }

            // 2. Fallback to payload identifiers (for robustness during dev/reconnects)
            if (!userId && payloadUserId && payloadUserName) {
                if (room.participants.has(payloadUserId)) {
                    userId = payloadUserId;
                    userName = payloadUserName;
                    logger.debug(`User found via payload ID: ${userId}`);
                } else {
                    userId = payloadUserId;
                    userName = payloadUserName;
                    logger.debug(`User NOT in active participants, but allowing via payload: ${userId}`);
                }
            }

            if (!userId) {
                logger.error(`User lookup failed entirely for socket ${socket.id}`);
                socket.emit('error', { message: 'User not found in room. Please rejoin.' });
                return;
            }

            // Save user message to DB
            const userMessage = await ChatMessage.create({
                roomId,
                sender: 'user',
                issueKey: room.currentIssue?.issueKey, // Capture active ticket context
                userId,
                userName,
                message,
                timestamp: new Date()
            });

            logger.info(`[CHAT] Saved user message: ${message.substring(0, 20)}... from ${userName} (${userId}) [Ticket: ${room.currentIssue?.issueKey || 'None'}]`);

            // Emit user message to all OTHER participants (sender handles it optimistically)
            socket.broadcast.to(roomId).emit('chat_message', {
                id: userMessage._id.toString(),
                sender: 'user',
                userId,
                userName,
                message,
                timestamp: userMessage.timestamp,
                issueKey: userMessage.issueKey // Pass back to client
            });


            // ... (rest of logic) ...

            // Get AI response using MessageBatcher (batches 5 messages → 1 API call)
            // Note: Batcher might need to know about issueKey too if we want to batch per ticket, 
            // but for now, simple room batching is okay as long as context is right.
            const aiResponse = await batcher.addMessage(roomId, message, userId, userName);

            // ... 

            if (aiResponse) {
                // Save AI message to DB
                const aiMessage = await ChatMessage.create({
                    roomId,
                    sender: 'ai',
                    issueKey: room.currentIssue?.issueKey, // Capture active ticket context
                    message: aiResponse,
                    timestamp: new Date(),
                    metadata: {
                        model: process.env.SIEMENS_LLM_MODEL || 'qwen3-30b',
                        issueKey: room.currentIssue?.issueKey
                    }
                });

                // Emit AI response to all participants
                io.to(roomId).emit('chat_message', {
                    id: aiMessage._id.toString(),
                    sender: 'ai',
                    message: aiResponse,
                    timestamp: aiMessage.timestamp,
                    metadata: aiMessage.metadata,
                    issueKey: aiMessage.issueKey
                });
            } else {
                logger.warn('[CHAT] No AI response received from batcher.');
            }

        } catch (error) {
            logger.error('Chat message error:', error);
            socket.emit('error', { message: 'Failed to send message' });
            io.to(roomId).emit('ai_typing', { isTyping: false });
        }
    });

    /**
     * Get chat history for a room
     */
    socket.on('get_chat_history', async ({ roomId, issueKey }) => {
        try {
            const query: any = { roomId };

            // STRICT FILTERING: 
            // If issueKey is provided, ONLY return messages for that issue.
            // If NO issueKey provided (general chat?), return messages with NO issueKey?
            // User requested "separate space". So filtering by issueKey is key.
            if (issueKey) {
                query.issueKey = issueKey;
            } else {
                // If user is just joining room without active ticket, or looking at general chat
                // Maybe show recent generic messages? 
                // For now, let's optionalize it.
            }

            logger.debug(`[CHAT] Fetching history for room ${roomId}, issue: ${issueKey || 'ALL'}`);

            const messages = await ChatMessage.find(query)
                .sort({ timestamp: 1 })
                .limit(100); // Last 100 messages

            socket.emit('chat_history', {
                messages: messages.map(m => ({
                    id: m._id.toString(),
                    sender: m.sender,
                    userId: m.userId,
                    userName: m.userName,
                    message: m.message,
                    timestamp: m.timestamp,
                    metadata: m.metadata,
                    issueKey: m.issueKey
                }))
            });
        } catch (error) {
            logger.error('Get chat history error:', error);
            socket.emit('error', { message: 'Failed to load chat history' });
        }
    });
};
