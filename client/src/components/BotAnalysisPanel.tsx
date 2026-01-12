import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { useGame } from '../context/GameContext';



interface BotAnalysisPanelProps {
    analysis: {
        story_points: number;
        confidence: 'high' | 'medium' | 'low';
        reasoning: string;
        risk_factors?: string[];
    } | null;
    isVisible: boolean;
    onClose: () => void;
    roomId: string;
}

interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    userId?: string;
    userName?: string;
    message: string;
    timestamp: Date;
    metadata?: any;
}

export function BotAnalysisPanel({ analysis, isVisible, onClose, roomId }: BotAnalysisPanelProps) {
    const { socket, userId, room, isConnected } = useGame();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get current user name from room participants
    const currentUser = room?.participants.find(p => p.userId === userId || p.odId === userId);
    const userName = currentUser?.displayName || 'Guest';

    // ... (rest of code)

    // Scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Socket event listeners
    // Get current issue key to use as context
    const currentIssueKey = room?.currentIssue?.issueKey;

    useEffect(() => {
        if (!isVisible || !roomId || !socket) return;

        // Load chat history for SPECIFIC issue when panel opens or issue changes

        setMessages([]); // Clear previous messages to avoid confusion
        socket.emit('get_chat_history', {
            roomId,
            issueKey: currentIssueKey
        });

        // Listen for chat history
        const handleChatHistory = (data: { messages: any[] }) => {
            setMessages(data.messages.map(m => ({
                ...m,
                timestamp: new Date(m.timestamp)
            })));
        };

        // Listen for new messages
        const handleChatMessage = (data: any) => {
            setMessages(prev => {
                // Deduplicate just in case
                if (prev.some(m => m.id === data.id)) return prev;

                // Optional: We could check if data.issueKey matches, but for now allow all room chatter
                return [...prev, {
                    ...data,
                    timestamp: new Date(data.timestamp)
                }];
            });
        };

        // Listen for typing indicator
        const handleAITyping = (data: { isTyping: boolean }) => {
            setIsTyping(data.isTyping);
        };

        // Handle errors
        const handleError = (error: { message: string }) => {
            console.error('Chat Socket Error:', error);
        };

        socket.on('chat_history', handleChatHistory);
        socket.on('chat_message', handleChatMessage);
        socket.on('ai_typing', handleAITyping);
        socket.on('error', handleError);

        return () => {
            socket.off('chat_history', handleChatHistory);
            socket.off('chat_message', handleChatMessage);
            socket.off('ai_typing', handleAITyping);
            socket.off('error', handleError);
        };
    }, [isVisible, roomId, socket, currentIssueKey]); // Added currentIssueKey dependency

    const handleSendMessage = (message: string) => {
        if (!socket || !isConnected) {
            console.error('Do not send message: Socket disconnected');
            alert('Cannot send message: You are currently offline. Please refresh the page.');
            return;
        }

        // 1. Optimistic Update: Show message immediately
        const optimisticId = Date.now().toString(); // temporary ID
        const optimisticMessage: ChatMessage = {
            id: optimisticId,
            sender: 'user',
            userId,
            userName,
            message,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, optimisticMessage]);

        // 2. Send to server
        socket.emit('send_chat_message', {
            roomId,
            message,
            userId,
            userName
        });
    };

    if (!isVisible) return null;

    return (
        <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed right-0 top-20 bottom-0 w-96 glass border-l border-white/10 z-50 flex flex-col shadow-2xl backdrop-blur-xl bg-black/40"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <span className="text-2xl animate-pulse">🤖</span>
                    <div>
                        <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                            AI Co-pilot
                        </h2>
                        <div className="text-xs text-zinc-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                            Online & Ready
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 -mr-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                    ✕
                </button>
            </div>

            {/* Combined Scrollable Area */}
            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {/* Analysis Content (now part of the scroll flow) */}
                {analysis && (
                    <div className="p-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                        <div className="glass bg-zinc-900/50 p-6 rounded-2xl border border-white/10 text-center shadow-lg relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className="relative">
                                <div className="text-xs font-medium text-zinc-400 mb-2 uppercase tracking-widest">Estimated Points</div>
                                <div className="text-5xl font-bold text-white glow-text-cyan mb-2 scale-100 group-hover:scale-110 transition-transform duration-300">
                                    {analysis.story_points}
                                </div>
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border
                                    ${analysis.confidence === 'high' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                        analysis.confidence === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                            'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                    <span className={`w-1 h-1 rounded-full ${analysis.confidence === 'high' ? 'bg-green-400' :
                                        analysis.confidence === 'medium' ? 'bg-yellow-400' :
                                            'bg-red-400'
                                        }`}></span>
                                    {analysis.confidence} Confidence
                                </div>
                            </div>
                        </div>

                        {/* Reasoning */}
                        <div className="mt-6 space-y-4">
                            <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                                <h3 className="flex items-center gap-2 text-xs font-bold text-cyan-400 mb-2 uppercase tracking-wider">
                                    <span className="text-lg">🤔</span>
                                    Reasoning
                                </h3>
                                <div className="text-zinc-300 text-sm leading-relaxed p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                    {analysis.reasoning}
                                </div>
                            </div>

                            {/* Risks */}
                            {analysis.risk_factors && analysis.risk_factors.length > 0 && (
                                <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                                    <h3 className="flex items-center gap-2 text-xs font-bold text-red-400 mb-2 uppercase tracking-wider mt-6">
                                        <span className="text-lg">⚠️</span>
                                        Risk Factors
                                    </h3>
                                    <ul className="space-y-2">
                                        {analysis.risk_factors.map((risk, i) => (
                                            <li key={i} className="flex gap-3 text-sm text-zinc-300 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                                                <span className="text-red-400 shrink-0 mt-0.5">•</span>
                                                <span>{risk}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Chat Messages */}
                <div className="p-4 space-y-4">
                    {/* Empty State / Welcome Message - Only show if no messages AND no analysis */}
                    {!analysis && messages.length === 0 && (
                        <div className="text-center text-zinc-500 text-sm py-12 px-6">
                            <div className="mb-4 text-4xl opacity-20">💬</div>
                            <p className="font-medium text-zinc-400 mb-1">Start a conversation</p>
                            <p className="text-xs opacity-60">Ask about story points, estimation logic, or agile best practices</p>
                        </div>
                    )}

                    {/* Divider if analysis exists and we interpret it as a "start" of context */}
                    {analysis && messages.length > 0 && (
                        <div className="flex items-center gap-4 py-2">
                            <div className="h-px bg-white/10 flex-1"></div>
                            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Chat History</span>
                            <div className="h-px bg-white/10 flex-1"></div>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <ChatBubble
                            key={msg.id}
                            sender={msg.sender}
                            userName={msg.userName}
                            message={msg.message}
                            timestamp={msg.timestamp}
                            issueKey={msg.metadata?.issueKey || (msg as any).issueKey} // Check both locations
                        />
                    ))}

                    {/* Typing Indicator */}
                    {isTyping && (
                        <div className="flex gap-3 mb-4 animate-fade-in">
                            <div className="avatar shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg bg-gradient-to-br from-cyan-500 to-purple-500 shadow-lg shadow-cyan-500/20">
                                🤖
                            </div>
                            <div className="flex items-center gap-1.5 p-4 rounded-2xl rounded-tl-none bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
                                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </div>

            {/* Input Area - Fixed at bottom */}
            <div className="p-4 bg-zinc-900 border-t border-white/10 backdrop-blur-xl">
                <ChatInput onSend={handleSendMessage} disabled={isTyping} />
            </div>
        </motion.div>
    );
}
