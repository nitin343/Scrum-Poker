
import { logger } from '../utils/logger/Logger';

export class GitHubService {

    /**
     * Analyzes the repositories linked to the board and generates a codebase map.
     * currently mocked to return a map of the Scrum Poker application itself.
     */
    async generateCodebaseMap(backendUrl: string, frontendUrl: string): Promise<string> {
        logger.info(`Generating codebase map for: ${backendUrl} and ${frontendUrl}`);

        // Mock Analysis Delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Return a high-quality map of THIS project (Scrum Poker) as a default
        // This allows the AI to understand the context of the app it is "living" in.
        return `
# Scrum Poker Codebase Map

## Architecture Overview
- **Stack**: MERN (MongoDB, Express, React, Node.js)
- **Frontend**: Vite + React + TypeScript + TailwindCSS + Framer Motion
- **Backend**: Node.js + Express + Socket.IO + Mongoose
- **Real-time**: Socket.IO for game state synchronization

## Key Components

### Frontend (Client)
- **State Management**: React Context (GameContext, AuthContext)
- **Routing**: React Router DOM
- **API**: Centralized \`api.ts\` service for REST endpoints
- **Game Logic**: \`GameRoomPage.tsx\` handles the main game loop; \`Table.tsx\` renders the poker table.
- **AI Integration**: \`BotAnalysisPanel.tsx\` displays AI reasoning; \`SettingsPage.tsx\` configures context.

### Backend (Server)
- **Entry Point**: \`index.ts\` initializes HTTP server and Socket.IO.
- **Game Store**: In-memory \`store.ts\` manages active rooms (Sprint/Ticket data).
- **Socket Handlers**: \`socket.ts\` processes real-time events (join, vote, reveal).
- **AI Service**: \`AIService.ts\` integrates with Siemens/OpenAI LLM for estimation.
- **Database**: MongoDB for user data and persisting sprint history.

## Data Models
- **Room**: In-memory representation of a game session.
- **Sprint**: Mongoose model storing tickets and voting history.
- **BoardContext**: Stores project context and repo URLs for AI analysis.
- **User**: Stores authentication and profile info.

## AI Integration Points
- **Estimation**: triggered in \`socket.ts\` via \`AIService.estimateTicket\`.
- **Context**: Loaded from \`BoardContext\` model.
- **Feedback**: AI estimates are stored in \`room.aiAnalysis\` and broadcast to clients.
`;
    }
}

export const githubService = new GitHubService();
