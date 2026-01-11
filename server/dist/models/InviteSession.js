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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InviteSession = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const crypto_1 = __importDefault(require("crypto"));
const InviteSessionSchema = new mongoose_1.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    inviteToken: {
        type: String,
        required: true,
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
// Generate unique session ID and invite token before validation
InviteSessionSchema.pre('validate', function () {
    if (!this.sessionId) {
        // Generate a URL-friendly 10-character session ID
        this.sessionId = crypto_1.default.randomBytes(5).toString('hex').toUpperCase();
    }
    if (!this.inviteToken) {
        // Generate a 32-character cryptographic token for guest verification
        this.inviteToken = crypto_1.default.randomBytes(16).toString('hex');
    }
});
// Create compound indexes
InviteSessionSchema.index({ boardId: 1, sprintId: 1 });
InviteSessionSchema.index({ createdBy: 1, isActive: 1 });
InviteSessionSchema.index({ sessionId: 1, inviteToken: 1 }); // For fast token validation
exports.InviteSession = mongoose_1.default.model('InviteSession', InviteSessionSchema);
