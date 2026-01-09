import mongoose, { Schema, Document, HydratedDocument } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface IAdmin {
    email: string;
    password: string;
    displayName: string;
    companyId: string;
    inviteCode: string;       // Unique code for inviting others
    invitedBy?: string;       // Who invited this user (userId)
    selectedBoardId?: string; // Last selected board
    createdAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const AdminSchema = new Schema<IAdmin>({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    displayName: {
        type: String,
        required: true,
        trim: true
    },
    companyId: {
        type: String,
        required: true,
        default: 'siemens'
    },
    inviteCode: {
        type: String,
        required: true,
        unique: true
    },
    invitedBy: {
        type: String,
        default: null
    },
    selectedBoardId: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Generate unique invite code before validation
AdminSchema.pre('validate', function () {
    if (!this.inviteCode) {
        // Generate a random 8-character alphanumeric invite code
        this.inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    }
});

// Hash password before saving using middleware function syntax
AdminSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
AdminSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

// Create indexes
// Create indexes
// Note: inviteCode index is created by the schema definition unique: true

export const Admin = mongoose.model<IAdmin>('Admin', AdminSchema);
