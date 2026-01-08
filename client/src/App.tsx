import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from './context/GameContext';
import { Table } from './components/Table';
import { CardDeck } from './components/CardDeck';
import { VotingResults } from './components/VotingResults';

function App() {
  const {
    room, isConnected, joinRoom, selectCard, revealCards, resetRound,
    userId, isScrumMaster, error
  } = useGame();

  const [displayName, setDisplayName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomNameInput, setRoomNameInput] = useState('');
  const [view, setView] = useState<'create' | 'join'>('create');

  const handleCreate = () => {
    if (!displayName || !roomNameInput) return;
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    joinRoom(newRoomId, displayName, true, roomNameInput);
  };

  const handleJoin = () => {
    if (!displayName || !roomIdInput) return;
    joinRoom(roomIdInput.toUpperCase(), displayName, false);
  };

  const copyRoomId = () => {
    if (room) {
      navigator.clipboard.writeText(room.roomId);
    }
  };

  // --- LOBBY VIEW ---
  if (!room) {
    return (
      <div className="min-h-screen bg-animated flex items-center justify-center p-4 lg:p-8 relative overflow-hidden">
        {/* Animated Background Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          className="glass-card w-full max-w-[480px] p-8 md:p-12 rounded-3xl relative z-10"
        >
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 text-white text-4xl mb-6 shadow-lg"
              style={{ boxShadow: '0 0 40px rgba(124, 58, 237, 0.4)' }}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              ♠️
            </motion.div>
            <h1 className="text-4xl font-extrabold text-gradient tracking-tight">
              Scrum Poker
            </h1>
            <p className="text-zinc-400 mt-3 text-lg font-medium">Agile estimation made elegant.</p>
          </motion.div>

          <AnimatePresence>
            {!isConnected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-amber-500/10 text-amber-400 rounded-xl text-sm border border-amber-500/20 flex items-center gap-3"
              >
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                Connecting to server...
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="mb-6 p-4 bg-red-500/10 text-red-400 rounded-xl text-sm border border-red-500/20 flex items-start gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <AnimatePresence mode="wait">
                {view === 'create' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  >
                    <label className="block text-sm font-semibold text-zinc-300 mb-2 ml-1">Room Name</label>
                    <input
                      type="text"
                      value={roomNameInput}
                      onChange={(e) => setRoomNameInput(e.target.value)}
                      placeholder="e.g. Sprint 42 Planning"
                      className="w-full px-5 py-4 rounded-xl border border-white/10 bg-white/5 focus:bg-white/10 focus:border-purple-500 outline-none transition-all duration-300 text-white placeholder-zinc-500 font-medium"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <label className="block text-sm font-semibold text-zinc-300 mb-2 ml-1">
                {view === 'create' ? 'Scrum Master Name' : 'Display Name'}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should we call you?"
                className="w-full px-5 py-4 rounded-xl border border-white/10 bg-white/5 focus:bg-white/10 focus:border-purple-500 outline-none transition-all duration-300 text-white placeholder-zinc-500 font-medium"
              />
            </motion.div>

            <motion.div
              className="bg-white/5 p-1.5 rounded-2xl flex relative"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div
                className="absolute top-1.5 bottom-1.5 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-xl"
                initial={false}
                animate={{
                  left: view === 'create' ? '6px' : 'calc(50% + 3px)',
                  right: view === 'create' ? 'calc(50% + 3px)' : '6px',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
              <button
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-colors duration-300 relative z-10 ${view === 'create' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                onClick={() => setView('create')}
              >
                Create Room
              </button>
              <button
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-colors duration-300 relative z-10 ${view === 'join' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                onClick={() => setView('join')}
              >
                Join Room
              </button>
            </motion.div>

            <AnimatePresence mode="wait">
              {view === 'join' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="block text-sm font-semibold text-zinc-300 mb-2 ml-1">Room Code</label>
                  <input
                    type="text"
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                    placeholder="e.g. X9Y2Z1"
                    className="w-full px-5 py-4 rounded-xl border border-white/10 bg-white/5 focus:bg-white/10 focus:border-purple-500 outline-none transition-all duration-300 text-white font-mono tracking-wider placeholder-zinc-500"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              onClick={view === 'create' ? handleCreate : handleJoin}
              disabled={!displayName || (!roomIdInput && view === 'join') || !isConnected}
              className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all duration-300 btn-glow ${!displayName || (!roomIdInput && view === 'join') || !isConnected
                ? 'bg-zinc-700 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-purple-600 to-cyan-500'
                }`}
              whileHover={((view === 'create' && displayName && roomNameInput) || (view === 'join' && displayName && roomIdInput)) && isConnected ? { scale: 1.02 } : {}}
              whileTap={((view === 'create' && displayName && roomNameInput) || (view === 'join' && displayName && roomIdInput)) && isConnected ? { scale: 0.98 } : {}}
            >
              {view === 'create' ? '🚀 Start New Session' : '🎯 Enter Room'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- GAME VIEW ---
  const myParticipant = room.participants.find(p => p.userId === userId);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-animated">

      {/* === MINIMAL NAVBAR === */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="shrink-0 glass border-b border-white/10 px-4 py-3 lg:px-8 z-50"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
              style={{ boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)' }}
            >
              SP
            </motion.div>
            <div>
              <h1 className="font-bold text-white text-sm leading-tight">{room.roomName || 'Scrum Poker'}</h1>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-medium">
                <motion.span
                  className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                  animate={isConnected ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
                {isConnected ? 'Online' : 'Connecting...'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <motion.button
              onClick={copyRoomId}
              className="flex items-center gap-2 glass border border-white/10 px-4 py-2 rounded-full transition-all text-xs group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="font-semibold text-zinc-400 uppercase tracking-wider">Room</span>
              <span className="font-mono font-bold text-purple-400 tracking-widest">{room.roomId}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </motion.button>

            <div className="text-right hidden md:block">
              <div className="text-sm font-bold text-white">{myParticipant?.displayName}</div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-gradient">
                {isScrumMaster ? '👑 Scrum Master' : '🎯 Team Member'}
              </div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* === MAIN CANVAS (Full Viewport Center) === */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-[140px] md:pb-[160px] relative">
        {/* Ambient Background Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-purple-600/10 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Table
            participants={room.participants}
            currentRound={room.currentRound}
            areCardsRevealed={room.areCardsRevealed}
            isScrumMaster={isScrumMaster}
            onReveal={revealCards}
            onReset={resetRound}
          />
        </motion.div>
      </main>

      {/* === BOTTOM PANEL (Fixed) === */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className={`py-4 px-4 ${room.areCardsRevealed ? '' : 'glass border-t border-white/10'}`}>
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              {room.areCardsRevealed ? (
                <motion.div
                  key="voting-results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <VotingResults
                    participants={room.participants}
                    isVisible={true}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="card-deck"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Choose Your Estimate</h3>
                    <AnimatePresence>
                      {myParticipant?.selectedCard && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="text-[10px] font-semibold text-purple-400 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30"
                        >
                          ✓ Selected: {myParticipant.selectedCard}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  <CardDeck
                    selectedValue={myParticipant?.selectedCard}
                    onSelect={selectCard}
                    disabled={room.areCardsRevealed}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
