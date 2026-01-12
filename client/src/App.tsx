import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import { AuthProvider } from './context/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { BoardSelectionPage } from './pages/BoardSelectionPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { GameRoomPage } from './pages/GameRoomPage';
import { GuestJoinPage } from './pages/GuestJoinPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GameProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />

            {/* Board Selection - after login */}
            <Route path="/select-board" element={
              <ProtectedRoute>
                <BoardSelectionPage />
              </ProtectedRoute>
            } />

            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />

            <Route path="/boards/:boardId/settings" element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } />

            {/* Game Room - allows both authenticated users and guests */}
            <Route path="/room/:roomId" element={<GameRoomPage />} />

            {/* Guest Join */}
            <Route path="/join/:sessionId" element={<GuestJoinPage />} />

            {/* Redirect root to board selection */}
            <Route path="/" element={<Navigate to="/select-board" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/select-board" replace />} />
          </Routes>
        </GameProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

