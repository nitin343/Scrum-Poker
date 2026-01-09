---
description: Security rules that MUST be followed for all coding in this project
---

# Security Workflow - MANDATORY

This workflow MUST be followed for EVERY coding action in this project.

## 🔒 BEFORE WRITING ANY CODE

1. **Check for sensitive data** - Never hard-code:
   - Passwords
   - API tokens/keys
   - Database connection strings
   - JWT secrets
   - Encryption keys

2. **Use environment variables** - All secrets must use:
   ```javascript
   process.env.VARIABLE_NAME
   ```

3. **Reference `.env.example`** - Check `server/.env.example` for variable names

## ❌ FORBIDDEN PATTERNS

```javascript
// NEVER DO THIS:
const password = 'my-secret-password';
const jiraToken = 'RIHPemcdHdRBVsh5Uhec41mpXfL0b2gYdI1ORG';
const mongoUri = 'mongodb+srv://user:pass@cluster.mongodb.net';

// ALWAYS DO THIS:
const password = process.env.JIRA_API_TOKEN;
const mongoUri = process.env.MONGODB_URI;
```

## ✅ REQUIRED PATTERNS

1. **Database connections:**
   ```javascript
   mongoose.connect(process.env.MONGODB_URI)
   ```

2. **Jira API:**
   ```javascript
   const jira = new JiraApi({
     host: process.env.JIRA_HOST,
     username: process.env.JIRA_USERNAME,
     password: process.env.JIRA_API_TOKEN,
   });
   ```

3. **JWT tokens:**
   ```javascript
   jwt.sign(payload, process.env.JWT_SECRET)
   ```

## 📋 PRE-COMMIT CHECKLIST

Before any code change:
- [ ] No hard-coded secrets in code
- [ ] `.env` is in `.gitignore`
- [ ] Sensitive data uses `process.env`
- [ ] No secrets in console.log statements
- [ ] No credentials in comments

## 🚨 IF CREDENTIALS ARE EXPOSED

1. STOP immediately
2. Do NOT commit
3. Remove the credentials from code
4. Notify the user
