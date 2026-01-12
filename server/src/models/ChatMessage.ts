import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
    roomId: string;
    issueKey?: string;
    sender: 'user' | 'ai';
    userId?: string;
    userName?: string;
    message: string;
    timestamp: Date;
    metadata?: {
        model?: string;
        tokens?: number;
        confidence?: string;
        batchId?: string;
        issueKey?: string;
    };
}

const ChatMessageSchema: Schema = new Schema({
    roomId: { type: String, required: true, index: true },
    issueKey: { type: String, index: true }, // Renamed from ticketId and added index
    sender: { type: String, required: true, enum: ['user', 'ai'] },
    userId: { type: String },
    userName: { type: String },
    message: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    metadata: {
        model: { type: String },
        tokens: { type: Number },
        confidence: { type: String },
        batchId: { type: String },
        issueKey: { type: String }
    }
}, {
    timestamps: true
});

// TTL Index: Auto-delete after 25 days
ChatMessageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 25 * 24 * 60 * 60 });

export default mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
