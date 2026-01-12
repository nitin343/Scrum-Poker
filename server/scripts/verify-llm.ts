const dotenv = require('dotenv');
const path = require('path');
const { aiService } = require('../src/services/AIService');

// Load env from one level up (server root)
dotenv.config({ path: path.join(__dirname, '../.env') });

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function verifyConnection() {
    console.log(`${YELLOW}🔍 Starting AI Connection Verification...${RESET}`);
    console.log('-------------------------------------------');

    // 1. Check Environment Variables
    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.SIEMENS_LLM_BASE_URL;

    if (apiKey) {
        console.log(`✅ OPENAI_API_KEY found: ${GREEN}${apiKey.substring(0, 8)}...${RESET}`);
        if (apiKey.startsWith('SIAK-')) {
            console.log(`🔒 Detected Siemens Internal Key format.`);
            if (baseUrl) {
                console.log(`✅ SIEMENS_LLM_BASE_URL found: ${GREEN}${baseUrl}${RESET}`);
            } else {
                console.log(`${RED}❌ Missing SIEMENS_LLM_BASE_URL! Required for SIAK keys.${RESET}`);
            }
        } else {
            console.log(`🌐 Standard OpenAI Key format detected.`);
        }
    } else {
        console.log(`${YELLOW}⚠️  OPENAI_API_KEY not found.${RESET}`);
        console.log(`   System will fallback to ${GREEN}Mock Mode${RESET}.`);
    }

    // 2. Perform Test Estimation
    console.log('\n🧠 Testing Estimation Service...');

    const testTicket = {
        key: 'TEST-VERIFY',
        summary: 'Verify AI Connection',
        description: 'As a developer, I want to ensure the LLM is connected so that I can get estimates.',
        issueType: 'Story',
        priority: 'High'
    };

    const startTime = Date.now();
    const result = await aiService.estimateTicket(testTicket, 'verification-board');
    const duration = Date.now() - startTime;

    if (result) {
        console.log(`\n${GREEN}✅ Estimation Successful!${RESET} (${duration}ms)`);
        console.log('-------------------------------------------');
        console.log('Story Points:', result.story_points);
        console.log('Confidence:  ', result.confidence);
        console.log('Reasoning:   ', result.reasoning);
        console.log('Risk Factors:', result.risk_factors);

        // Heuristic to detect if it was a mock response
        if (result.reasoning.includes('Mock Estimate') || duration < 100) {
            console.log(`\n${YELLOW}ℹ️  Result appears to be from MOCK service.${RESET}`);
        } else {
            console.log(`\n${GREEN}🚀 Result appears to be from LIVE LLM.${RESET}`);
        }
    } else {
        console.log(`\n${RED}❌ Estimation Failed. returned null.${RESET}`);
    }

    console.log('-------------------------------------------');
}

verifyConnection().catch(err => {
    console.error(`${RED}FATAL ERROR:${RESET}`, err);
});
