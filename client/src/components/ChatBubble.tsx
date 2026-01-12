import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatBubbleProps {
    sender: 'user' | 'ai';
    userName?: string;
    message: string;
    timestamp: Date;
    issueKey?: string;
}

export function ChatBubble({ sender, userName, message, timestamp, issueKey }: ChatBubbleProps) {
    const formatTime = (date: Date) => {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`chat-bubble ${sender} flex gap-3 mb-4`}
        >
            {/* Avatar */}
            <div className={`avatar shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg
                ${sender === 'ai' ? 'bg-gradient-to-br from-cyan-500 to-purple-500' : 'bg-zinc-700'}`}>
                {sender === 'ai' ? '🤖' : '👤'}
            </div>

            {/* Message Content */}
            <div className="flex-1">
                {/* Name (for user messages) */}
                {sender === 'user' && userName && (
                    <div className="text-xs text-zinc-400 mb-1 font-medium">{userName}</div>
                )}

                {/* Message */}
                <div className={`message-content p-3 rounded-lg ${sender === 'ai'
                    ? 'bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20'
                    : 'bg-zinc-800 border border-zinc-700'
                    }`}>
                    <div className="text-sm text-zinc-100 leading-relaxed overflow-hidden">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0" {...props} />,
                                ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                                ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                                li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
                                strong: ({ node, ...props }: any) => <strong className="font-bold text-cyan-300" {...props} />,
                                a: ({ node, ...props }: any) => <a className="text-cyan-400 hover:underline break-all" target="_blank" rel="noopener noreferrer" {...props} />,
                                blockquote: ({ node, ...props }: any) => <blockquote className="border-l-2 border-zinc-500 pl-3 italic text-zinc-400 my-2" {...props} />,
                                code: ({ node, className, children, ...props }: any) => {
                                    const match = /language-(\w+)/.exec(className || '')
                                    return !match ? (
                                        <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs font-mono text-amber-200" {...props}>
                                            {children}
                                        </code>
                                    ) : (
                                        <div className="my-2 bg-black/40 rounded-md overflow-hidden border border-zinc-700/50">
                                            <div className="px-3 py-1 bg-zinc-800/50 text-xs text-zinc-500 border-b border-zinc-700/50 flex justify-between">
                                                <span>{match[1]}</span>
                                            </div>
                                            <div className="p-3 overflow-x-auto">
                                                <code className={`font-mono text-sm ${className}`} {...props}>
                                                    {children}
                                                </code>
                                            </div>
                                        </div>
                                    )
                                }
                            }}
                        >
                            {message}
                        </ReactMarkdown>
                    </div>
                </div>

                {/* Timestamp & Context */}
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-zinc-500">{formatTime(timestamp)}</span>
                    {typeof issueKey === 'string' && (
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">
                            {issueKey}
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
