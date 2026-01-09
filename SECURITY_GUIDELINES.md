# Security Guidelines for Scrum Poker Pro

## 🔒 MANDATORY SECURITY RULES

These guidelines MUST be followed by all developers (human and AI agents) when working on this project.

---

## 1. Secrets Management

### ❌ NEVER DO
- Hard-code passwords, API keys, or tokens in source code
- Commit `.env` files to version control
- Log sensitive data (passwords, tokens, PII)
- Store secrets in plain text files
- Include real credentials in code comments or documentation

### ✅ ALWAYS DO
- Store secrets in environment variables (`.env` files)
- Add `.env` to `.gitignore` BEFORE creating it
- Use `.env.example` with placeholder values for documentation
- Encrypt sensitive data at rest and in transit
- Rotate credentials regularly

### Required Files
```
.env              # Real secrets - NEVER commit (in .gitignore)
.env.example      # Template with placeholders - COMMIT this
```

---

## 2. Environment Variables Template

Create `.env.example` with these placeholders:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# MongoDB (use MongoDB Atlas connection string)
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>

# Jira Integration
JIRA_HOST=your-company.atlassian.net
JIRA_USERNAME=<api-username>
JIRA_API_TOKEN=<your-api-token>
JIRA_CUSTOM_HEADER=<header-value>

# JWT Authentication
JWT_SECRET=<generate-random-256-bit-key>
JWT_EXPIRES_IN=7d

# Encryption (for storing sensitive data)
ENCRYPTION_KEY=<generate-random-256-bit-key>
```

---

## 3. API Security

### Authentication
- Use JWT tokens with short expiration (7 days max)
- Implement refresh token rotation
- Hash passwords with bcrypt (cost factor 12+)
- Never store plain-text passwords

### Authorization
- Validate user permissions on EVERY request
- Admin routes must check `isAdmin` flag
- Use role-based access control (RBAC)

### Input Validation
- Validate ALL user inputs on server-side
- Sanitize inputs to prevent XSS
- Use parameterized queries (no SQL/NoSQL injection)
- Limit request body size

### Rate Limiting
- Implement rate limiting on auth endpoints
- 5 login attempts per minute per IP
- 100 API requests per minute per user

---

## 4. Database Security (MongoDB)

### Connection
- Use TLS/SSL for all connections
- Use MongoDB Atlas with IP whitelist
- Create dedicated database user with minimal permissions
- Never use admin user for application

### Data Encryption
- Enable encryption at rest (Atlas default)
- Encrypt sensitive fields (passwords, tokens) before storing
- Use field-level encryption for PII if applicable

### Queries
- Use Mongoose schema validation
- Never build queries from user input directly
- Use `.lean()` for read-only queries (prevents prototype pollution)

---

## 5. Jira API Security

### Credential Storage
```javascript
// ❌ WRONG - Never do this
const jira = new JiraApi({
  password: 'hardcoded-api-token'  // NEVER!
});

// ✅ CORRECT - Use environment variables
const jira = new JiraApi({
  password: process.env.JIRA_API_TOKEN
});
```

### API Token Handling
- Store Jira API token in environment variable
- Use service account, not personal credentials
- Request minimum necessary Jira permissions
- Log API calls (without tokens) for audit

---

## 6. Frontend Security

### Data Exposure
- Never expose admin-only data to regular users
- Filter API responses based on user role
- Don't include sensitive data in client-side state

### XSS Prevention
- React auto-escapes by default (keep it!)
- Never use `dangerouslySetInnerHTML` with user content
- Sanitize any user-generated content before display

### CORS
- Configure strict CORS in production
- Only allow specific origins, not `*`

---

## 7. Git & Version Control

### .gitignore (REQUIRED)
```gitignore
# Environment files
.env
.env.local
.env.production

# Logs
*.log
npm-debug.log*

# Secrets
*.pem
*.key
secrets/

# IDE
.idea/
.vscode/
*.swp

# Build
node_modules/
dist/
build/
```

### Pre-commit Checks
- Scan for secrets before commit (use git-secrets or similar)
- Never commit `.env` files
- Review diffs for accidental credential exposure

---

## 8. Deployment Security

### Environment Separation
- Different credentials for dev/staging/production
- Production secrets only accessible in production
- Use Vercel/Railway/Render environment variables

### HTTPS
- Always use HTTPS in production
- Redirect HTTP to HTTPS
- Use secure cookies (`Secure`, `HttpOnly`, `SameSite`)

---

## 9. Logging & Monitoring

### Safe Logging
```javascript
// ❌ WRONG
console.log('User login:', { email, password });

// ✅ CORRECT
console.log('User login attempt:', { email, timestamp: new Date() });
```

### What to Log
- Authentication events (login, logout, failed attempts)
- Authorization failures
- API errors (without sensitive data)
- Rate limit violations

### What NOT to Log
- Passwords
- API tokens
- Full credit card numbers
- Session tokens
- Personal identification numbers

---

## 10. Dependency Security

### Regular Updates
- Run `npm audit` weekly
- Update dependencies with known vulnerabilities
- Use `npm audit fix` for automatic fixes

### Trusted Sources
- Only use packages from npm registry
- Check package popularity and maintenance
- Review package permissions

---

## 📋 Pre-Integration Checklist

Before implementing MongoDB and Jira:

- [ ] `.gitignore` includes `.env`
- [ ] `.env.example` created with placeholders
- [ ] No hard-coded credentials in codebase
- [ ] Environment variables configured in deployment platform
- [ ] MongoDB Atlas IP whitelist configured
- [ ] Jira API token stored as environment variable
- [ ] JWT secret generated and stored securely
- [ ] HTTPS enabled for production

---

## 🚨 Security Incident Response

If credentials are accidentally committed:
1. **Immediately** revoke the exposed credentials
2. Generate new credentials
3. Update environment variables
4. Force-push to remove from git history (if necessary)
5. Scan for unauthorized access

---

## Acknowledgment

By working on this project, developers agree to follow these security guidelines. Any deviation must be documented and approved.
