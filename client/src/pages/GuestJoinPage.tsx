import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';

export function GuestJoinPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();


    // If we are a guest, we don't have a token. 
    // We need to handle "Guest Auth" in AuthContext or GameContext.
    // Plan:
    // 1. Fetch session info to show "Joining [Board] - [Sprint]"
    // 2. Ask for Name.
    // 3. On Submit -> Store name in localStorage (or context) as "Guest User"
    // 4. Navigate to /room/:sessionId
    // 5. GameRoomPage/GameContext needs to handle connection for guests differently (no token, pass displayName).

    const [isLoading, setIsLoading] = useState(true);
    const [sessionInfo, setSessionInfo] = useState<any>(null);
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!sessionId) return;
        fetchSessionInfo();
    }, [sessionId, token]);

    const fetchSessionInfo = async () => {
        try {
            const res = await api.sessions.get(sessionId!, token || undefined); // Use token if available
            // Response structure: { success: true, data: { boardName, ... } }
            if (res?.success && res?.data?.boardName) {
                setSessionInfo(res.data);
            } else {
                setError('Session not found or expired');
            }
        } catch (err) {
            console.error('Guest join session lookup error:', err);
            setError('Failed to load session details');
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!displayName.trim()) return;

        // Store guest identity. 
        // We can use AuthContext's login mechanism if we create a "fake" guest token or just update the user object?
        // But AuthContext expects a token for isAuthenticated.
        // GameContext uses isAuthenticated to connect with token.
        // We need to update GameContext to support Guest connection:
        // if (!isAuthenticated && isGuest) { socket.emit('join_as_guest') }

        // For now, let's store guest details in sessionStorage 'guest_user'
        sessionStorage.setItem('guest_user', JSON.stringify({ displayName, sessionId }));

        // Redirect to room
        const tokenParam = token ? `&token=${token}` : '';
        navigate(`/room/${sessionId}?guest=true${tokenParam}`);
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center text-white bg-animated">Loading...</div>;
    if (error) return <div className="flex h-screen items-center justify-center text-red-400 bg-animated">{error}</div>;

    return (
        <div className="flex min-h-screen items-center justify-center bg-animated p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-10 pointer-events-none" />

            <div className="glass-card w-full max-w-md p-8 rounded-3xl relative z-10 border border-white/10 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 mx-auto flex items-center justify-center text-2xl font-bold text-white shadow-lg mb-4">
                        SP
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Join Session</h1>
                    <div className="text-zinc-400">
                        <span className="block text-sm font-semibold text-purple-300">{sessionInfo?.boardName}</span>
                        <span className="block text-xs">{sessionInfo?.sprintName}</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-2">
                        Hosted by {sessionInfo?.createdByName || 'Scrum Master'}
                    </div>
                </div>

                <form onSubmit={handleJoin} className="space-y-6">
                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            Your Display Name
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-medium"
                            placeholder="e.g. John Doe"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Enter Room
                    </button>
                </form>
            </div>
        </div>
    );
}
