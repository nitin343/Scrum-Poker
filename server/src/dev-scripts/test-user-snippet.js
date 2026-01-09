require('dotenv').config();
const JiraApi = require('jira-client');

async function test() {
    console.log('Testing User Snippet Logic...');

    // Check if env vars are loaded
    if (!process.env.JIRA_API_TOKEN) {
        console.error('Error: JIRA_API_TOKEN not found in environment');
        return;
    }

    const config = {
        protocol: 'https',
        host: 'agileworld.siemens.cloud',
        base: '/jira',
        username: process.env.JIRA_API_USER || process.env.JIRA_USERNAME || 'api_user_EP_FY26_001',
        password: process.env.JIRA_API_TOKEN, // Using env var
        apiVersion: '2',
        strictSSL: true,
        headers: {
            'x-cloud-operations-api': process.env.JIRA_CUSTOM_HEADER_VALUE || '8dFTff1LytwGXzZsmbKzmq83'
        }
    };

    console.log('Config:', {
        ...config,
        password: '***',
        headers: { ...config.headers, 'x-cloud-operations-api': '***' }
    });

    try {
        const jira = new JiraApi(config);
        const user = await jira.getCurrentUser();
        console.log('✅ Success! User:', user.displayName);
    } catch (e) {
        console.error('❌ Error:', e.message);
        if (e.response) {
            console.error('Status:', e.response.status);
            console.error('Data:', JSON.stringify(e.response.data, null, 2));
        } else {
            console.error('Full Error:', e);
        }
    }
}

test();
