"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sprint = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const VotingRecordSchema = new mongoose_1.Schema({
    participantName: { type: String, required: true },
    participantId: { type: String, required: true },
    vote: { type: mongoose_1.Schema.Types.Mixed, required: true },
    votedAt: { type: Date, default: Date.now }
}, { _id: false });
const VotingRoundSchema = new mongoose_1.Schema({
    roundNumber: { type: Number, default: 1 },
    votes: [VotingRecordSchema],
    average: Number,
    agreement: Number,
    finalPoints: Number,
    finalTimeEstimate: String,
    revealedAt: Date,
    updatedInJira: { type: Boolean, default: false }
}, { _id: false });
const AssigneeSchema = new mongoose_1.Schema({
    accountId: { type: String }, // Made optional - some Jira issues may not have full assignee info
    displayName: { type: String }
}, { _id: false });
const TicketSchema = new mongoose_1.Schema({
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
const SprintSchema = new mongoose_1.Schema({
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
        default: false // Disabled by default, admin must enable
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
exports.default = mongoose_1.default.model('Sprint', SprintSchema);
exports.Sprint = mongoose_1.default.model('Sprint', SprintSchema);
