import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

/**
 * InviteSession - Represents a shareable invite link for guests to join a poker session
 */
export interface IInviteSession extends Document {
    sessionId: string;       // Unique shareable code (in URL)
    boardId: string;         // Jira board ID
    boardName: string;       // Display name for guests
    sprintId: string;        // Jira sprint ID
    sprintName: string;      // Display name for guests
    companyId: string;       // Company context
    createdBy: string;       // Admin userId who created the session
    createdByName: string;   // Admin display name
    createdAt: Date;
    expiresAt?: Date;        // Optional expiry
    isActive: boolean;       // Can be deactivated without deleting
}

const InviteSessionSchema: Schema = new Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    boardId: {
        type: String,
        required: true
    },
    boardName: {
        type: String,
        required: true
    },
    sprintId: {
        type: String,
        required: true
    },
    sprintName: {
        type: String,
        required: true
    },
    companyId: {
        type: String,
        required: true,
        index: true
    },
    createdBy: {
        type: String,
        required: true,
        index: true
    },
    createdByName: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

// Generate unique session ID before validation
InviteSessionSchema.pre('validate', function () {
    if (!this.sessionId) {
        // Generate a URL-friendly 10-character session ID
        this.sessionId = crypto.randomBytes(5).toString('hex').toUpperCase();
    }
});

// Create compound indexes
InviteSessionSchema.index({ boardId: 1, sprintId: 1 });
InviteSessionSchema.index({ createdBy: 1, isActive: 1 });

export const InviteSession = mongoose.model<IInviteSession>('InviteSession', InviteSessionSchema);
