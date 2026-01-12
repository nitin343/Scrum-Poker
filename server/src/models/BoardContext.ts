import mongoose, { Schema, Document } from 'mongoose';

export interface IBoardContext extends Document {
    boardId: string;
    projectContext?: string;
    backendRepoUrl?: string;
    frontendRepoUrl?: string;
    codebaseMap?: string; // Summarized map of the codebase
    lastAnalyzedAt?: Date;
}

const BoardContextSchema: Schema = new Schema({
    boardId: { type: String, required: true, unique: true },
    projectContext: { type: String },
    backendRepoUrl: { type: String },
    frontendRepoUrl: { type: String },
    codebaseMap: { type: String },
    lastAnalyzedAt: { type: Date }
}, {
    timestamps: true
});

export default mongoose.models.BoardContext || mongoose.model<IBoardContext>('BoardContext', BoardContextSchema);
