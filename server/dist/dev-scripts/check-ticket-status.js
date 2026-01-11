"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const SprintSchema = new mongoose_1.default.Schema({
    sprintId: String,
    tickets: [{
            issueKey: String,
            votingRounds: [{
                    updatedInJira: Boolean,
                    finalPoints: Number,
                    finalTimeEstimate: String,
                    revealedAt: Date
                }]
        }]
});
const Sprint = mongoose_1.default.model('Sprint', SprintSchema);
async function checkTicket() {
    try {
        await mongoose_1.default.connect(process.env.MONGODB_URI || '');
        console.log('Connected to DB');
        const sprintId = '15390';
        const issueKey = 'GDT-4872';
        const sprint = await Sprint.findOne({ sprintId });
        if (!sprint) {
            console.log('Sprint not found');
            return;
        }
        const ticket = sprint.tickets.find((t) => t.issueKey === issueKey);
        if (!ticket) {
            console.log('Ticket not found in sprint');
            return;
        }
        console.log('Ticket found:', issueKey);
        console.log('Voting Rounds:', JSON.stringify(ticket.votingRounds, null, 2));
    }
    catch (err) {
        console.error(err);
    }
    finally {
        await mongoose_1.default.disconnect();
    }
}
checkTicket();
