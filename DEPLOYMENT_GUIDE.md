# 🚀 Scrum Poker - Production Deployment Guide

## Overview
This guide walks you through deploying the Scrum Poker application using Docker containers with proper environment configuration and database connectivity.

---

## 📋 Prerequisites

- Docker & Docker Compose installed
- MongoDB Atlas account (or local MongoDB)
- Jira Cloud account with API access
- Domain/hosting for frontend (optional: Vercel, Netlify)
- Node.js hosting for backend (optional: Railway, Render, DigitalOcean)

---

## 🔧 Step 1: Environment Variables Setup

### Backend Environment Variables

Create `server/.env` file with the following:

```env
# Server Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend-domain.com

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/scrum-poker?retryWrites=true&w=majority

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Jira Configuration
JIRA_HOST=https://your-company.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-jira-api-token

# CORS Origins (comma-separated for multiple origins)
CORS_ORIGIN=https://your-frontend-domain.com,https://www.your-frontend-domain.com
```

### Frontend Environment Variables

Create `client/.env` file:

```env
# Backend API URL
VITE_API_URL=https://your-backend-domain.com
VITE_WS_URL=wss://your-backend-domain.com
```

---

## 🐳 Step 2: Docker Setup

### Option A: Docker Compose (Recommended for Full Stack)

Create `docker-compose.yml` in the root directory:

```yaml
version: '3.8'

services:
  # MongoDB Database
  mongodb:
    image: mongo:7.0
    container_name: scrum-poker-db
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: your-secure-password
      MONGO_INITDB_DATABASE: scrum-poker
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      - mongodb_config:/data/configdb
    networks:
      - scrum-poker-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend Server
  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: scrum-poker-backend
    restart: always
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      PORT: 3001
      MONGODB_URI: mongodb://admin:your-secure-password@mongodb:27017/scrum-poker?authSource=admin
      JWT_SECRET: ${JWT_SECRET}
      JIRA_HOST: ${JIRA_HOST}
      JIRA_EMAIL: ${JIRA_EMAIL}
      JIRA_API_TOKEN: ${JIRA_API_TOKEN}
      FRONTEND_URL: ${FRONTEND_URL}
      CORS_ORIGIN: ${CORS_ORIGIN}
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - scrum-poker-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend (Optional - can deploy separately to Vercel/Netlify)
  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL}
        VITE_WS_URL: ${VITE_WS_URL}
    container_name: scrum-poker-frontend
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - scrum-poker-network

volumes:
  mongodb_data:
    driver: local
  mongodb_config:
    driver: local

networks:
  scrum-poker-network:
    driver: bridge
```

### Backend Dockerfile

Create `server/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]
```

### Frontend Dockerfile

Create `client/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_WS_URL

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose ports
EXPOSE 80 443

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration

Create `client/nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 🗄️ Step 3: Database Connection Verification

### Method 1: Using Docker Compose

The `docker-compose.yml` includes health checks that verify MongoDB is ready before starting the backend.

### Method 2: Manual Verification

**Test MongoDB Connection:**

```bash
# From your local machine
mongosh "mongodb://admin:your-secure-password@localhost:27017/scrum-poker?authSource=admin"

# Inside the backend container
docker exec -it scrum-poker-backend node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ DB Connected'))
  .catch(err => console.error('❌ DB Error:', err));
"
```

### Method 3: Backend Health Check Endpoint

Add this to `server/src/index.ts`:

```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : 'disconnected';
    
    if (dbState !== 1) {
      return res.status(503).json({
        status: 'unhealthy',
        database: dbStatus,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'healthy',
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

---

## 🚀 Step 4: Deployment Steps

### Using Docker Compose

```bash
# 1. Create .env file in root directory
cp .env.example .env
# Edit .env with your production values

# 2. Build and start all services
docker-compose up -d --build

# 3. Check logs
docker-compose logs -f

# 4. Verify services are running
docker-compose ps

# 5. Test health endpoints
curl http://localhost:3001/health
curl http://localhost:80
```

### Using Separate Containers

**Backend:**
```bash
cd server

# Build image
docker build -t scrum-poker-backend .

# Run container
docker run -d \
  --name scrum-poker-backend \
  -p 3001:3001 \
  --env-file .env \
  scrum-poker-backend

# Check logs
docker logs -f scrum-poker-backend
```

**Frontend:**
```bash
cd client

# Build image with build args
docker build \
  --build-arg VITE_API_URL=https://api.yourdomain.com \
  --build-arg VITE_WS_URL=wss://api.yourdomain.com \
  -t scrum-poker-frontend .

# Run container
docker run -d \
  --name scrum-poker-frontend \
  -p 80:80 \
  scrum-poker-frontend
```

---

## 🔍 Step 5: Verification Checklist

### Database Connection
- [ ] MongoDB container is running: `docker ps | grep mongodb`
- [ ] Backend can connect to MongoDB: `docker logs scrum-poker-backend | grep "MongoDB connected"`
- [ ] Health endpoint shows DB connected: `curl http://localhost:3001/health`

### Backend API
- [ ] Server is running: `curl http://localhost:3001/health`
- [ ] WebSocket is working: Check browser console for socket connection
- [ ] Jira integration works: Test sync from dashboard

### Frontend
- [ ] Frontend loads: `curl http://localhost:80`
- [ ] Can connect to backend API
- [ ] WebSocket connection established
- [ ] Authentication works

---

## 🔐 Step 6: Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET (min 32 characters)
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS properly
- [ ] Set up firewall rules
- [ ] Use environment variables (never commit .env)
- [ ] Enable MongoDB authentication
- [ ] Regular security updates

---

## 📊 Monitoring & Logs

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f mongodb

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Monitor Resource Usage
```bash
# Real-time stats
docker stats

# Specific container
docker stats scrum-poker-backend
```

---

## 🛠️ Troubleshooting

### Database Connection Issues

**Problem:** Backend can't connect to MongoDB

**Solutions:**
1. Check MongoDB is running: `docker ps | grep mongodb`
2. Verify connection string in .env
3. Check MongoDB logs: `docker logs scrum-poker-db`
4. Test connection manually: `mongosh "your-connection-string"`

### Environment Variables Not Loading

**Problem:** App can't read environment variables

**Solutions:**
1. Verify .env file exists and has correct format
2. Restart containers: `docker-compose restart`
3. Rebuild with no cache: `docker-compose build --no-cache`
4. Check env vars inside container: `docker exec scrum-poker-backend env`

### Port Conflicts

**Problem:** Port already in use

**Solutions:**
1. Check what's using the port: `netstat -ano | findstr :3001`
2. Stop conflicting service or change port in docker-compose.yml
3. Use different ports: `-p 3002:3001`

---

## 🌐 Production Deployment Options

### Option 1: Cloud Platforms (Easiest)

**Backend:**
- Railway.app
- Render.com
- Heroku
- DigitalOcean App Platform

**Frontend:**
- Vercel (Recommended)
- Netlify
- Cloudflare Pages

**Database:**
- MongoDB Atlas (Recommended)
- AWS DocumentDB

### Option 2: VPS/Dedicated Server

- DigitalOcean Droplet
- AWS EC2
- Google Cloud Compute Engine
- Azure Virtual Machines

Use the Docker Compose setup from this guide.

---

## 📝 Quick Start Commands

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# Restart a service
docker-compose restart backend

# View logs
docker-compose logs -f backend

# Rebuild and restart
docker-compose up -d --build

# Clean everything (including volumes)
docker-compose down -v
```

---

## 🎯 Next Steps

1. Set up SSL certificates (Let's Encrypt)
2. Configure domain names
3. Set up CI/CD pipeline
4. Configure backup strategy for MongoDB
5. Set up monitoring (Prometheus, Grafana)
6. Configure log aggregation

---

## 📞 Support

For issues or questions:
- Check logs: `docker-compose logs`
- Review health endpoint: `curl http://localhost:3001/health`
- Verify environment variables are set correctly
