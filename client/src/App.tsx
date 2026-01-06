
import { useState } from 'react';
import { useGame } from './context/GameContext';
import { Table } from './components/Table';
import { CardDeck } from './components/CardDeck';

function App() {
  const {
    room, isConnected, joinRoom, selectCard, revealCards, resetRound,
    userId, isScrumMaster, error
  } = useGame();

  const [displayName, setDisplayName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [view, setView] = useState<'create' | 'join'>('create');

  const handleCreate = () => {
    if (!displayName) return;
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    joinRoom(newRoomId, displayName, true);
  };

  const handleJoin = () => {
    if (!displayName || !roomIdInput) return;
    joinRoom(roomIdInput.toUpperCase(), displayName, false);
  };

  const copyRoomId = () => {
    if (room) {
      navigator.clipboard.writeText(room.roomId);
      // Optional: Add a toast notification here
    }
  };

  // --- LOBBY VIEW ---
  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 lg:p-8">
        <div className="glass-card w-full max-w-[480px] p-8 md:p-12 rounded-3xl animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white text-3xl mb-6 shadow-lg shadow-indigo-500/30">
              ♠️
            </div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
              Scrum Poker
            </h1>
            <p className="text-gray-500 mt-3 text-lg font-medium">Agile estimation made elegant.</p>
          </div>

          {!isConnected && (
            <div className="mb-6 p-4 bg-amber-50/80 text-amber-700 rounded-xl text-sm border border-amber-100 flex items-center gap-3 backdrop-blur-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              Connecting to server...
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50/80 text-red-600 rounded-xl text-sm border border-red-100 backdrop-blur-sm flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should we call you?"
                className="w-full px-5 py-3.5 rounded-xl border border-gray-200 bg-white/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all duration-200 text-gray-800 placeholder-gray-400 font-medium"
              />
            </div>

            <div className="bg-gray-100/50 p-1.5 rounded-2xl flex relative">
              <button
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 relative z-10 ${view === 'create' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setView('create')}
              >
                Create Room
              </button>
              <button
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 relative z-10 ${view === 'join' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setView('join')}
              >
                Join Room
              </button>
            </div>

            {view === 'join' && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Room Code</label>
                <input
                  type="text"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                  placeholder="e.g. X9Y2Z1"
                  className="w-full px-5 py-3.5 rounded-xl border border-gray-200 bg-white/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all duration-200 text-gray-800 font-mono tracking-wider placeholder-gray-400"
                />
              </div>
            )}

            <button
              onClick={view === 'create' ? handleCreate : handleJoin}
              disabled={!displayName || (!roomIdInput && view === 'join') || !isConnected}
              className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg hover:shadow-indigo-500/40 transition-all active:scale-[0.98] duration-200 ${!displayName || (!roomIdInput && view === 'join') || !isConnected
                  ? 'bg-gray-300 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'
                }`}
            >
              {view === 'create' ? 'Start New Session' : 'Enter Room'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- GAME VIEW ---
  const myParticipant = room.participants.find(p => p.userId === userId);

  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      {/* Navbar */}
      <nav className="glass sticky top-0 z-50 px-4 py-3 lg:px-8 border-b border-white/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <span className="font-bold text-lg">SP</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-gray-900 leading-tight">Scrum Poker</h1>
              <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {isConnected ? 'Online' : 'Offline'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <button
              onClick={copyRoomId}
              className="group flex items-center gap-2 bg-white/50 hover:bg-white border border-gray-200/60 px-4 py-2 rounded-full transition-all hover:shadow-md cursor-pointer"
              title="Click to copy room ID"
            >
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider group-hover:text-indigo-500 transition-colors">Room</span>
              <span className="font-mono font-bold text-gray-800 text-lg tracking-widest">{room.roomId}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>

            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <div className="text-sm font-bold text-gray-900">{myParticipant?.displayName}</div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block">
                  {isScrumMaster ? 'Scrum Master' : 'Member'}
                </div>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="Leave Room"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 lg:p-8 flex flex-col">
        <div className="flex-1 flex flex-col justify-center items-center relative min-h-[500px]">
          <Table
            participants={room.participants}
            currentRound={room.currentRound}
            areCardsRevealed={room.areCardsRevealed}
            isScrumMaster={isScrumMaster}
            onReveal={revealCards}
            onReset={resetRound}
          />
        </div>
      </main>

      {/* Footer / Control Deck */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
        <div className={`
          bg-white/90 backdrop-blur-xl border-t border-white/50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] 
          pb-8 pt-6 px-4 transition-transform duration-500 ease-spring
          ${room.areCardsRevealed ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}
          pointer-events-auto
        `}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Choose your estimate</h3>
              {myParticipant?.selectedCard && (
                <span className="text-sm font-medium text-indigo-600 animate-pulse">
                  Selection active
                </span>
              )}
            </div>

            <CardDeck
              selectedValue={myParticipant?.selectedCard}
              onSelect={selectCard}
              disabled={room.areCardsRevealed}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
