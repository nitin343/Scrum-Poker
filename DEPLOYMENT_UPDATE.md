# 🚀 Deployment Update Guide - Continuation

## Overview
This guide continues from your existing deployment and helps you update your hosted application with the latest changes.

---

## 📍 Current Deployment Status

Based on your setup, you have:
- ✅ Backend server already hosted
- ✅ Frontend already hosted  
- ✅ MongoDB connection configured
- ✅ Siemens Jira integration configured

---

## 🔄 Step 1: Update Your Hosted Backend

### Option A: If Using Git-Based Deployment (Railway, Render, Vercel Functions)

These platforms auto-deploy when you push to main:

```bash
# Your code is already pushed to main, so:
# 1. Go to your hosting platform dashboard
# 2. Check the deployment logs
# 3. Verify the new deployment is live
```

**Verify Deployment:**
```bash
# Check if new health endpoint works
curl https://your-backend-url.com/health

# Should return:
{
  "status": "healthy",
  "database": "connected",
  "uptime": 12345,
  "timestamp": "2026-01-11T04:00:00.000Z"
}
```

### Option B: If Using Manual Server Deployment (VPS/EC2)

```bash
# SSH into your server
ssh user@your-server-ip

# Navigate to project directory
cd /path/to/scrum-poker

# Pull latest changes
git pull origin main

# Install any new dependencies
cd server
npm install

# Rebuild TypeScript
npm run build

# Restart the server
pm2 restart scrum-poker-backend
# OR if using systemd:
sudo systemctl restart scrum-poker-backend
# OR if using Docker:
docker-compose restart backend
```

---

## 🎨 Step 2: Update Your Hosted Frontend

### Option A: If Using Vercel/Netlify

These platforms auto-deploy from git:

```bash
# 1. Check your deployment dashboard
# 2. Look for the latest deployment from main branch
# 3. Verify it's live
```

**Manual Trigger (if needed):**
- Vercel: Go to project → Deployments → Redeploy
- Netlify: Go to Deploys → Trigger deploy

### Option B: If Using Manual Deployment

```bash
# On your local machine
cd client

# Build the frontend with production API URL
npm run build

# The dist/ folder now contains your production build

# Upload to your hosting:
# - If using S3: aws s3 sync dist/ s3://your-bucket-name
# - If using FTP: Upload dist/ contents to your web server
# - If using nginx: Copy dist/ to /var/www/html
```

---

## 🔍 Step 3: Verify Database Connection

### Check Backend Health Endpoint

```bash
# Test the enhanced health endpoint
curl https://your-backend-url.com/health

# Expected response if DB is connected:
{
  "status": "healthy",
  "database": "connected",
  "uptime": 12345,
  "timestamp": "2026-01-11T04:00:00.000Z"
}

# If DB is NOT connected, you'll get:
{
  "status": "unhealthy",
  "database": "disconnected",
  "timestamp": "2026-01-11T04:00:00.000Z"
}
```

### Verify MongoDB Connection String

Your MongoDB URI should be in this format:
```
mongodb+srv://username:password@cluster.mongodb.net/scrum-poker?retryWrites=true&w=majority
```

**Common Issues:**
1. **Password contains special characters**: URL-encode them
   - `@` → `%40`
   - `#` → `%23`
   - `$` → `%24`
   
2. **IP Whitelist**: Make sure your hosting server's IP is whitelisted in MongoDB Atlas
   - Go to MongoDB Atlas → Network Access
   - Add your server's IP or use `0.0.0.0/0` (allow all - less secure)

3. **Database name**: Ensure the database name in the URI matches your app

---

## 🔐 Step 4: Update Environment Variables on Hosting Platform

### For Railway.app

```bash
# Go to your project dashboard
# Navigate to: Variables tab
# Update/Add these variables:
```

**Required Variables:**
```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/scrum-poker?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-min-32-chars
FRONTEND_URL=https://your-frontend-domain.com

# Siemens Jira Configuration
JIRA_PROTOCOL=https
JIRA_HOST=agileworld.siemens.cloud
JIRA_BASE=/jira
JIRA_USERNAME=your-username
JIRA_API_TOKEN=your-api-token
JIRA_API_VERSION=2
JIRA_CUSTOM_HEADER=your-custom-header-value

ALLOWED_ORIGIN=https://your-frontend-domain.com
```

### For Render.com

```bash
# Go to your service dashboard
# Navigate to: Environment
# Add/Update environment variables
```

### For Vercel (Frontend)

```bash
# Go to project settings
# Navigate to: Environment Variables
# Add these:
```

**Frontend Variables:**
```env
VITE_API_URL=https://your-backend-url.com
VITE_WS_URL=wss://your-backend-url.com
```

### For DigitalOcean/AWS/VPS

```bash
# SSH into your server
ssh user@your-server-ip

# Edit the .env file
cd /path/to/scrum-poker/server
nano .env

# Update the values, then save (Ctrl+X, Y, Enter)

# Restart the application
pm2 restart all
```

---

## 🧪 Step 5: Test the Updated Deployment

### Backend Tests

```bash
# 1. Health check
curl https://your-backend-url.com/health

# 2. Root endpoint
curl https://your-backend-url.com/

# 3. API endpoint (requires auth)
curl https://your-backend-url.com/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. WebSocket connection (from browser console)
const ws = new WebSocket('wss://your-backend-url.com');
ws.onopen = () => console.log('✅ WebSocket connected');
ws.onerror = (e) => console.error('❌ WebSocket error:', e);
```

### Frontend Tests

1. **Open your frontend URL** in browser
2. **Check browser console** for errors
3. **Test authentication** - Login/Register
4. **Create a room** - Verify room creation works
5. **Sync Jira** - Test Jira integration
6. **Vote on an issue** - Test voting flow
7. **Check voting results** - Verify new UI layout

### Specific UI Changes to Verify

✅ **Voting Results Layout:**
- Vote distribution bars on left
- Average & Agreement stats in center
- Save controls on right

✅ **Conditional Display:**
- During voting: Shows "ROUND 1" and vote count
- All voted: Shows "Reveal" button (centered)
- After reveal: Shows "Next Issue" button (centered)

✅ **Cursor Pointer:**
- All buttons show pointer cursor on hover
- All links show pointer cursor on hover

---

## 🐛 Step 6: Troubleshooting

### Issue: Backend Health Check Shows "unhealthy"

**Diagnosis:**
```bash
# Check backend logs
# Railway: View logs in dashboard
# Render: View logs in dashboard
# VPS: pm2 logs scrum-poker-backend
```

**Common Causes:**
1. MongoDB connection string is incorrect
2. MongoDB IP whitelist doesn't include your server
3. Environment variables not loaded

**Solution:**
```bash
# Verify environment variables are set
# Railway/Render: Check Variables tab
# VPS: cat /path/to/scrum-poker/server/.env

# Test MongoDB connection manually
mongosh "your-mongodb-uri"
```

### Issue: Frontend Can't Connect to Backend

**Diagnosis:**
```bash
# Open browser console (F12)
# Look for CORS errors or connection errors
```

**Common Causes:**
1. `VITE_API_URL` is incorrect
2. CORS not configured properly
3. Backend is down

**Solution:**
```bash
# 1. Verify frontend environment variables
# Vercel: Settings → Environment Variables
# Check VITE_API_URL matches your backend URL

# 2. Verify backend CORS settings
# Check ALLOWED_ORIGIN includes your frontend URL

# 3. Test backend directly
curl https://your-backend-url.com/health
```

### Issue: WebSocket Connection Fails

**Diagnosis:**
```bash
# Browser console shows WebSocket error
```

**Common Causes:**
1. `VITE_WS_URL` uses `ws://` instead of `wss://`
2. Hosting platform doesn't support WebSockets
3. Firewall blocking WebSocket connections

**Solution:**
```bash
# 1. Use wss:// for production
VITE_WS_URL=wss://your-backend-url.com

# 2. Verify hosting platform supports WebSockets
# Railway: ✅ Supported
# Render: ✅ Supported
# Vercel Functions: ❌ Not supported (use separate backend)

# 3. Test WebSocket from browser console
const ws = new WebSocket('wss://your-backend-url.com');
```

### Issue: Jira Integration Not Working

**Diagnosis:**
```bash
# Check backend logs for Jira errors
# Try syncing Jira from dashboard
```

**Common Causes:**
1. Jira API token expired
2. Jira credentials incorrect
3. Network/firewall blocking Jira API

**Solution:**
```bash
# 1. Verify Jira credentials
# Test manually:
curl -u "username:api-token" \
  "https://agileworld.siemens.cloud/jira/rest/api/2/myself"

# 2. Regenerate API token if needed
# Go to: Jira → Profile → Security → API Tokens

# 3. Update environment variables with new token
```

---

## 📊 Step 7: Monitor Your Deployment

### Set Up Monitoring

**Option 1: Use Hosting Platform Monitoring**
- Railway: Built-in metrics dashboard
- Render: Built-in metrics and alerts
- Vercel: Analytics dashboard

**Option 2: External Monitoring (Recommended)**

**UptimeRobot (Free):**
```bash
# 1. Sign up at uptimerobot.com
# 2. Add HTTP(s) monitor for backend health endpoint
#    URL: https://your-backend-url.com/health
#    Interval: 5 minutes
# 3. Add HTTP(s) monitor for frontend
#    URL: https://your-frontend-url.com
#    Interval: 5 minutes
# 4. Set up email/SMS alerts
```

**Better Stack (Free tier):**
```bash
# 1. Sign up at betterstack.com
# 2. Add uptime monitor
# 3. Add log monitoring
# 4. Set up incident alerts
```

### Check Logs Regularly

**Backend Logs:**
```bash
# Railway: Dashboard → Logs tab
# Render: Dashboard → Logs tab
# VPS: pm2 logs scrum-poker-backend
```

**Frontend Logs:**
```bash
# Vercel: Dashboard → Deployments → View logs
# Netlify: Dashboard → Deploys → View logs
```

---

## 🎯 Step 8: Performance Optimization

### Backend Optimizations

```bash
# 1. Enable compression
# Already included in your setup

# 2. Add rate limiting (if not already done)
npm install express-rate-limit

# 3. Enable caching for Jira responses
# Consider Redis for session storage
```

### Frontend Optimizations

```bash
# 1. Verify production build is optimized
cd client
npm run build

# Check dist/ folder size
# Should be ~500KB - 2MB gzipped

# 2. Enable CDN (if using Vercel/Netlify)
# Already enabled by default

# 3. Check Lighthouse score
# Open frontend in Chrome
# F12 → Lighthouse → Run audit
# Target: 90+ performance score
```

### Database Optimizations

```bash
# 1. Create indexes in MongoDB
# Connect to MongoDB Atlas
# Go to: Collections → Indexes
# Add indexes for frequently queried fields:
# - rooms.sessionId
# - rooms.participants.userId
# - sprints.boardId
```

---

## ✅ Deployment Checklist

### Pre-Deployment
- [x] Code pushed to main branch
- [ ] Environment variables updated on hosting platform
- [ ] MongoDB IP whitelist includes hosting server IP
- [ ] Jira API token is valid

### Post-Deployment
- [ ] Backend health endpoint returns "healthy"
- [ ] Frontend loads without errors
- [ ] Can login/register
- [ ] Can create room
- [ ] Can sync Jira issues
- [ ] Can vote on issues
- [ ] Voting results display correctly
- [ ] WebSocket connection works
- [ ] All buttons show pointer cursor

### Monitoring Setup
- [ ] Uptime monitoring configured
- [ ] Error alerts configured
- [ ] Log monitoring set up
- [ ] Performance monitoring enabled

---

## 🔄 Future Updates

### To Deploy Future Changes:

```bash
# 1. Make changes locally
# 2. Test locally
npm run dev

# 3. Commit and push
git add .
git commit -m "feat: your change description"
git push origin main

# 4. Hosting platforms will auto-deploy
# 5. Verify deployment in platform dashboard
# 6. Test the live site
```

---

## 📞 Quick Reference

### Your Current Setup

**Backend:**
- Platform: [Your hosting platform]
- URL: `https://your-backend-url.com`
- Health Check: `https://your-backend-url.com/health`

**Frontend:**
- Platform: [Your hosting platform]
- URL: `https://your-frontend-url.com`

**Database:**
- MongoDB Atlas
- Connection via `MONGODB_URI` environment variable

**Jira:**
- Siemens Jira Cloud
- Host: `agileworld.siemens.cloud`

### Important Commands

```bash
# Check backend health
curl https://your-backend-url.com/health

# View backend logs (VPS)
pm2 logs scrum-poker-backend

# Restart backend (VPS)
pm2 restart scrum-poker-backend

# Rebuild frontend
cd client && npm run build

# Test WebSocket (browser console)
new WebSocket('wss://your-backend-url.com')
```

---

## 🎉 You're All Set!

Your deployment is now updated with:
- ✅ Enhanced voting results UI
- ✅ Conditional display logic
- ✅ Cursor pointer on all clickable elements
- ✅ Database health monitoring
- ✅ Production-ready builds

**Next Steps:**
1. Test all features on your live site
2. Set up monitoring alerts
3. Share the app with your team
4. Gather feedback for future improvements

---

## Need Help?

**Common Resources:**
- Backend logs: Check your hosting platform dashboard
- Frontend errors: Browser console (F12)
- Database issues: MongoDB Atlas dashboard
- Jira issues: Test API token manually

**Health Check:**
Always start troubleshooting by checking:
```bash
curl https://your-backend-url.com/health
```

This tells you if the backend and database are working!
