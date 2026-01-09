const http = require('http');

// First, we'll sign up and get a token
const signupData = JSON.stringify({
  email: `testuser-${Date.now()}@test.com`,
  password: 'TestPassword123!',
  displayName: 'Test User'
});

const signupOptions = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/v1/auth/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': signupData.length
  }
};

console.log('🔐 Attempting to sign up...\n');

const signupReq = http.request(signupOptions, (signupRes) => {
  let signupBody = '';
  
  signupRes.on('data', (chunk) => {
    signupBody += chunk;
  });
  
  signupRes.on('end', () => {
    try {
      const signupResponse = JSON.parse(signupBody);
      
      if (signupResponse.token) {
        const token = signupResponse.token;
        console.log('✅ Sign up successful!\n');
        console.log(`📝 Token: ${token.substring(0, 20)}...\n`);
        
        // Now fetch the boards using the token
        const boardsOptions = {
          hostname: 'localhost',
          port: 3001,
          path: '/api/v1/jira/boards',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };
        
        console.log('🎯 Fetching Jira boards...\n');
        
        const boardsReq = http.request(boardsOptions, (boardsRes) => {
          let boardsBody = '';
          
          boardsRes.on('data', (chunk) => {
            boardsBody += chunk;
          });
          
          boardsRes.on('end', () => {
            try {
              const boardsResponse = JSON.parse(boardsBody);
              console.log('📊 RAW JIRA API RESPONSE:\n');
              console.log(JSON.stringify(boardsResponse, null, 2));
              process.exit(0);
            } catch (err) {
              console.error('❌ Error parsing boards response:', err.message);
              console.error('Response body:', boardsBody);
              process.exit(1);
            }
          });
        });
        
        boardsReq.on('error', (err) => {
          console.error('❌ Error fetching boards:', err.message);
          process.exit(1);
        });
        
        boardsReq.end();
        
      } else {
        console.error('❌ Sign up failed:', signupResponse);
        process.exit(1);
      }
    } catch (err) {
      console.error('❌ Error parsing signup response:', err.message);
      console.error('Response body:', signupBody);
      process.exit(1);
    }
  });
});

signupReq.on('error', (err) => {
  console.error('❌ Error during signup:', err.message);
  process.exit(1);
});

signupReq.write(signupData);
signupReq.end();
