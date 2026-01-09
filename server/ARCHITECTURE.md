# Backend Architecture Documentation

## 📁 Directory Structure

```
server/src/
├── api/v1/                      # API versioning (Ready for v2, v3, etc.)
│   ├── routes/
│   │   ├── index.ts            # Main route aggregator
│   │   ├── auth.ts             # Authentication endpoints
│   │   └── jira.ts             # Jira integration endpoints
│   └── middleware/
│       └── auth.ts             # JWT authentication middleware
│
├── services/                     # Business logic layer
│   ├── JiraService.ts          # Jira integration (client, testing, boards, sprints)
│   ├── AuthService.ts          # Authentication operations
│   ├── SprintService.ts        # Sprint management
│   ├── GameService.ts          # Game/voting session logic
│   └── index.ts                # Service exports
│
├── models/                       # MongoDB schemas
│   ├── Admin.ts                # Admin user model
│   ├── Company.ts              # Company model
│   └── Sprint.ts               # Sprint model
│
├── middleware/                   # Shared middleware
│   ├── auth.ts                 # JWT verification
│   └── errorMiddleware.ts      # Global error handling
│
├── utils/                        # Utility functions and helpers
│   ├── logger/
│   │   └── Logger.ts           # Structured logging service
│   ├── errors/
│   │   ├── AppError.ts         # Custom error class
│   │   └── ErrorHandler.ts     # Error handling utilities
│   ├── validators/
│   │   └── [validation functions]
│   └── constants/
│       └── [app constants]
│
├── db/                           # Database
│   └── connection.ts           # MongoDB connection setup
│
├── types/                        # TypeScript type definitions
│   └── [type definitions]
│
├── dev-scripts/                  # Development utilities (excluded from build)
│   ├── test-user-snippet.js
│   └── verify-jira.ts
│
├── __tests__/                    # Test files
│   ├── auth.test.ts
│   ├── jira.test.ts
│   └── setup.ts
│
├── socket.ts                     # WebSocket setup for real-time features
├── store.ts                      # In-memory store for rooms
├── app.ts                        # Express app configuration
└── index.ts                      # Server entry point
```

## 🎯 Key Architecture Patterns

### 1. **API Versioning**
- Routes organized under `api/v1/` pattern
- Ready to add `v2`, `v3` without breaking existing clients
- Example: `/api/v1/auth/login`, `/api/v1/jira/test-connection`

### 2. **Service Layer**
Services encapsulate business logic and are reusable across:
- HTTP routes
- WebSocket handlers
- Scheduled jobs
- CLI tools

**Services:**
- `JiraService` - Jira client, connection testing, API calls
- `AuthService` - User authentication, token management
- `SprintService` - Sprint CRUD and Jira sync
- `GameService` - Voting game logic

### 3. **Middleware**
- **Authentication Middleware** - Protects routes requiring JWT
- **Error Middleware** - Centralized error handling and logging
- Applied globally in `app.ts`

### 4. **Utils Organization**
- `Logger` - Structured logging with levels (info, warn, error, success)
- `Errors` - Custom AppError class with error codes
- `Validators` - Input validation utilities
- `Constants` - App-wide constants

### 5. **Data Flow**
```
Request → Middleware (auth) → Route Handler → Service → Model/DB → Response
```

## 🚀 API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - Register new admin
- `POST /api/v1/auth/login` - Authenticate user
- `GET /api/v1/auth/me` - Get current user (protected)

### Jira Integration
- `GET /api/v1/jira/test-connection` - Test Jira connectivity
- `GET /api/v1/jira/boards` - Get all Jira boards
- `GET /api/v1/jira/boards/:boardId/sprints` - Get board sprints
- `GET /api/v1/jira/current-user` - Get authenticated Jira user

## 🔧 Configuration

### Environment Variables
```env
# Server
PORT=3001
NODE_ENV=production

# Database
MONGODB_URI=mongodb://...

# Authentication
JWT_SECRET=your-secret-key

# Jira Integration
JIRA_PROTOCOL=https
JIRA_HOST=agileworld.siemens.cloud
JIRA_BASE=/jira
JIRA_USERNAME=api_user
JIRA_API_TOKEN=your-token
JIRA_CUSTOM_HEADER_NAME=x-cloud-operations-api
JIRA_CUSTOM_HEADER_VALUE=value
```

## 📝 Service Examples

### Using JiraService
```typescript
import { jiraService } from './services';

// Test connection
const result = await jiraService.testConnection();

// Get boards
const boards = await jiraService.getBoards();

// Get sprints
const sprints = await jiraService.getSprints(boardId);

// Check if configured
const configured = jiraService.isConfigured();
```

### Using AuthService
```typescript
import { authService } from './services';

// Generate token
const token = authService.generateToken({ id: userId, email });

// Verify token
const payload = authService.verifyToken(token);

// User operations
const admin = await authService.login(email, password);
const newAdmin = await authService.signup(email, password, displayName);
```

## 🧪 Testing

Tests are in `__tests__/` directory:
- `auth.test.ts` - Authentication tests
- `jira.test.ts` - Jira integration tests
- `setup.ts` - Test configuration

Run tests:
```bash
npm test
```

## 🔒 Security Features

- ✅ JWT-based authentication
- ✅ Middleware-based route protection
- ✅ Error sanitization (no sensitive data in logs)
- ✅ Environment variable validation
- ✅ CORS configuration
- ✅ Structured error handling

## 📊 Logging

Structured logging with context:
```typescript
import { logger } from './utils/logger/Logger';

logger.info('User logged in', { userId, email });
logger.error('Database error', { error: err.message });
logger.success('Server started', { port: 3001 });
logger.warn('High memory usage', { memory: 500 });
```

## 🚀 Development Workflow

1. **Add new feature:**
   - Create service in `services/`
   - Create routes in `api/v1/routes/`
   - Add middleware if needed in `api/v1/middleware/`

2. **Add new endpoint:**
   - Define in appropriate service
   - Create route handler
   - Add tests
   - Update this documentation

3. **Database changes:**
   - Create/modify model in `models/`
   - Update services that use it
   - Create migration if needed

## 🎯 Future Improvements

- [ ] Database migrations
- [ ] Caching layer (Redis)
- [ ] Rate limiting
- [ ] API documentation (Swagger/OpenAPI)
- [ ] GraphQL support alongside REST
- [ ] Webhook support for Jira events
- [ ] Advanced game logic and analytics
