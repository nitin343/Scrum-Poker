import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
    companyId: string;
    displayName: string;
    jiraHost: string;
    jiraBase: string;
    // Note: Jira credentials stored encrypted or in env vars per company
    isActive: boolean;
    createdAt: Date;
}

const CompanySchema: Schema = new Schema({
    companyId: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    displayName: {
        type: String,
        required: true
    },
    jiraHost: {
        type: String,
        required: true
    },
    jiraBase: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const Company = mongoose.model<ICompany>('Company', CompanySchema);
