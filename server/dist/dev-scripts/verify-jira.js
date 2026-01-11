"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const JiraService_1 = require("../services/JiraService");
dotenv_1.default.config();
async function verifyJira() {
    console.log('🔄 Testing Jira Connection...');
    console.log(`Host: ${process.env.JIRA_HOST}`);
    console.log(`User: ${process.env.JIRA_USERNAME}`);
    try {
        const result = await JiraService_1.jiraService.testConnection();
        if (result.success) {
            console.log('✅ Jira Connection Successful!');
            console.log('Message:', result.message);
        }
        else {
            console.error('❌ Jira Connection Failed:', result.message);
        }
    }
    catch (error) {
        console.error('❌ Jira Connection Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}
verifyJira();
