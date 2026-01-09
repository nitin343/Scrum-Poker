#!/usr/bin/env node

/**
 * Simple test to fetch Jira boards
 * This will make a request to the boards endpoint
 */

const https = require('https');

// First register/login to get a token
function getToken() {
    return new Promise((resolve) => {
        const credentials = JSON.stringify({
            email: `test${Date.now()}@example.com`,
            password: 'Password123!',
            displayName: 'Test User'
        });

        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/v1/auth/signup',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': credentials.length
            }
        };

        const req = require('http').request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.token) {
                        console.log('✅ Got auth token\n');
                        resolve(response.token);
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        });

        req.on('error', () => {
            resolve(null);
        });

        req.write(credentials);
        req.end();
    });
}

// Fetch boards with authentication
function fetchBoards(token) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/v1/jira/boards',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const req = require('http').request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve(data);
            });
        });

        req.on('error', (error) => {
            console.error('Request error:', error.message);
            resolve(null);
        });

        req.end();
    });
}

// Main
async function main() {
    console.log('🚀 Fetching Jira Boards...\n');
    
    try {
        console.log('1️⃣  Getting authentication token...');
        const token = await getToken();
        
        if (!token) {
            console.log('❌ Failed to get authentication token');
            return;
        }

        console.log('2️⃣  Fetching boards from /api/v1/jira/boards...\n');
        const result = await fetchBoards(token);
        
        if (result) {
            try {
                const boards = JSON.parse(result);
                console.log('📊 Response:', JSON.stringify(boards, null, 2));
            } catch (e) {
                console.log('Response:', result);
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
