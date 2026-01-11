"use strict";
/**
 * Debug Script: Test DB Save for Voting Rounds
 * Run with: npx ts-node src/dev-scripts/test-db-save.ts
 */
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
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function testDbSave() {
    console.log('=== Testing DB Save for Voting Rounds ===\n');
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/scrum-poker';
    console.log('Connecting to MongoDB:', mongoUri);
    await mongoose_1.default.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    // Import Sprint model
    const Sprint = (await Promise.resolve().then(() => __importStar(require('../models/Sprint')))).default;
    // Find any sprint with tickets
    const sprint = await Sprint.findOne({ 'tickets.0': { $exists: true } });
    if (!sprint) {
        console.log('❌ No sprint with tickets found');
        process.exit(1);
    }
    console.log('✅ Found Sprint:', sprint.sprintId);
    console.log('   Ticket count:', sprint.tickets.length);
    // Get first ticket
    const ticket = sprint.tickets[0];
    console.log('\n📋 First Ticket:', ticket.issueKey);
    console.log('   Current votingRounds:', ticket.votingRounds.length);
    // Add a test voting round
    const testVote = {
        participantId: 'test-user-123',
        participantName: 'Test User',
        vote: '8',
        votedAt: new Date()
    };
    const testRound = {
        roundNumber: 999,
        votes: [testVote],
        revealedAt: new Date(),
        updatedInJira: false
    };
    console.log('\n➕ Adding test voting round...');
    ticket.votingRounds.push(testRound);
    try {
        await sprint.save();
        console.log('✅ Sprint saved successfully!');
        // Verify by re-fetching
        const verifySpint = await Sprint.findOne({ 'tickets.issueKey': ticket.issueKey });
        const verifyTicket = verifySpint?.tickets.find(t => t.issueKey === ticket.issueKey);
        console.log('\n🔍 Verification:');
        console.log('   votingRounds count:', verifyTicket?.votingRounds.length);
        console.log('   Last round:', verifyTicket?.votingRounds[verifyTicket.votingRounds.length - 1]);
    }
    catch (error) {
        console.log('❌ Failed to save:', error);
    }
    await mongoose_1.default.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
}
testDbSave().catch(console.error);
