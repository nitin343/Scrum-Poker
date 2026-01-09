#!/usr/bin/env node

/**
 * Test script to fetch all Jira boards from the API
 */

const http = require('http');

// First, get a token by logging in
function login() {
    return new Promise((resolve, reject) => {
        const loginData = JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
            displayName: 'Test User'
        });

        const loginOptions = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/v1/auth/signup',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': loginData.length
            }
        };

        const req = http.request(loginOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response.token);
                } catch (e) {
                    // Token might not be needed, try without it
                    resolve(null);
                }
            });
        });

        req.on('error', (error) => {
            console.log('Note: Login failed (user may already exist), will try with test token');
            resolve(null);
        });

        req.write(loginData);
        req.end();
    });
}

// Get Jira boards
function getBoards(token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/v1/jira/boards',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // Add auth header if we have a token
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (e) {
                    resolve({ error: 'Failed to parse response', raw: data });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

// Main execution
async function main() {
    console.log('🚀 Starting Jira Boards Test...\n');

    try {
        console.log('1️⃣  Logging in...');
        const token = await login();
        if (token) {
            console.log('✅ Login successful, token:', token.substring(0, 20) + '...\n');
        } else {
            console.log('⚠️  No token obtained, will try without authentication\n');
        }

        console.log('2️⃣  Fetching Jira boards...');
        const boards = await getBoards(token);

        console.log('\n📊 JIRA BOARDS RESPONSE:\n');
        console.log(JSON.stringify(boards, null, 2));

        if (boards.boards && boards.boards.length > 0) {
            console.log('\n✅ BOARDS FOUND:\n');
            boards.boards.forEach((board, index) => {
                console.log(`${index + 1}. Board Name: ${board.name}`);
                console.log(`   Board ID: ${board.id}`);
                console.log(`   Board Type: ${board.type}\n`);
            });
        } else {
            console.log('\n⚠️  No boards found or error in response');
        }
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.log('\n💡 Make sure the server is running on port 3001');
    }
}

main();
