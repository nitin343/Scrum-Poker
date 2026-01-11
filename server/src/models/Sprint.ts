import mongoose, { Schema, Document } from 'mongoose';

// Voting record for a single ticket
export interface IVotingRecord {
    participantName: string;
    participantId: string;
    vote: string | number;
    votedAt: Date;
}

// Ticket within a sprint
export interface ITicket {
    issueKey: string;
    issueId?: string; // Jira ID (optional for backward compat)
    issueType: 'Story' | 'Bug' | 'Task' | 'Sub-task';
    // Optional fields - fetched from Jira on demand
    summary?: string;
    description?: string;
    jiraUrl?: string; // Constructable from key
    assignee?: {
        accountId: string;
        displayName: string;
    };
    currentPoints?: number;
    timeEstimate?: string; // For bugs
    votingRounds: Array<{
        roundNumber: number;
        votes: IVotingRecord[];
        average?: number;
        agreement?: number;
        finalPoints?: number;
        finalTimeEstimate?: string;
        revealedAt?: Date;
        updatedInJira: boolean;
    }>;
}

// Sprint/Space within a room
export interface ISprint extends Document {
    sprintId: string;
    sprintName: string;
    boardId: string;
    companyId: string;
    shareableCode: string;
    status: 'active' | 'completed';
    isEnabled: boolean;           // Manual enable/disable by admin
    jiraState: 'future' | 'active' | 'closed'; // From Jira
    currentIssueIndex: number;    // Track which issue is being voted
    tickets: ITicket[];
    createdAt: Date;
    completedAt?: Date;
}

const VotingRecordSchema = new Schema({
    participantName: { type: String, required: true },
    participantId: { type: String, required: true },
    vote: { type: Schema.Types.Mixed, required: true },
    votedAt: { type: Date, default: Date.now }
}, { _id: false });

const VotingRoundSchema = new Schema({
    roundNumber: { type: Number, default: 1 },
    votes: [VotingRecordSchema],
    average: Number,
    agreement: Number,
    finalPoints: Number,
    finalTimeEstimate: String,
    revealedAt: Date,
    updatedInJira: { type: Boolean, default: false }
}, { _id: false });

const AssigneeSchema = new Schema({
    accountId: { type: String },  // Made optional - some Jira issues may not have full assignee info
    displayName: { type: String }
}, { _id: false });

const TicketSchema = new Schema({
    issueKey: { type: String, required: true },
    issueId: { type: String }, // Optional for now
    summary: { type: String }, // Optional
    description: String,
    issueType: {
        type: String,
        // enum: ['Story', 'Bug', 'Task', 'Sub-task'], // Relax enum to allow others
        default: 'Story'
    },
    jiraUrl: String,
    assignee: AssigneeSchema,
    currentPoints: Number,
    timeEstimate: String,
    votingRounds: [VotingRoundSchema]
}, { _id: false });

const SprintSchema: Schema = new Schema({
    sprintId: {
        type: String,
        required: true
    },
    sprintName: {
        type: String,
        required: true
    },
    boardId: {
        type: String,
        required: true,
        index: true
    },
    companyId: {
        type: String,
        required: true,
        index: true
    },
    shareableCode: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['active', 'completed'],
        default: 'active'
    },
    isEnabled: {
        type: Boolean,
        default: false  // Disabled by default, admin must enable
    },
    jiraState: {
        type: String,
        enum: ['future', 'active', 'closed'],
        default: 'future'
    },
    currentIssueIndex: {
        type: Number,
        default: 0
    },
    tickets: [TicketSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date
});

// Create indexes
SprintSchema.index({ boardId: 1, sprintId: 1 }, { unique: true });
SprintSchema.index({ companyId: 1, boardId: 1 });
// Note: shareableCode index is created by the schema definition unique: true

export default mongoose.model<ISprint>('Sprint', SprintSchema);

export const Sprint = mongoose.model<ISprint>('Sprint', SprintSchema);
