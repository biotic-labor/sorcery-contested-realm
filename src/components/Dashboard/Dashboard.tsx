import { useState } from 'react';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';
import { ConnectionStatus } from '../../types/multiplayer';

interface DashboardProps {
  onGameStart: () => void;
}

export function Dashboard({ onGameStart }: DashboardProps) {
  const {
    nickname,
    setNickname,
    connectionStatus,
    connectionError,
    gameCode,
    createGame,
    joinGame,
    disconnect,
    savedGames,
    deleteSavedGame,
  } = useMultiplayerStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editedNickname, setEditedNickname] = useState(nickname);
  const [joinCode, setJoinCode] = useState('');
  const [activeTab, setActiveTab] = useState<'play' | 'saved'>('play');

  const handleNicknameSave = () => {
    if (editedNickname.trim()) {
      setNickname(editedNickname.trim());
    }
    setIsEditing(false);
  };

  const handleCreateGame = async () => {
    try {
      await createGame();
    } catch (error) {
      // Error is handled in the store
    }
  };

  const handleJoinGame = async () => {
    if (!joinCode.trim()) return;
    try {
      await joinGame(joinCode.trim());
      onGameStart();
    } catch (error) {
      // Error is handled in the store
    }
  };

  const handleCancel = () => {
    disconnect();
  };

  const getStatusMessage = (status: ConnectionStatus): string => {
    switch (status) {
      case 'initializing':
        return 'Initializing...';
      case 'waiting':
        return 'Waiting for opponent...';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return 'Connected!';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'error':
        return 'Connection error';
      default:
        return '';
    }
  };

  // If connected, transition to game
  if (connectionStatus === 'connected') {
    // Small delay to ensure state is synced
    setTimeout(() => onGameStart(), 100);
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Starting game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-gray-700">
        <h1 className="text-3xl font-bold text-center">Sorcery TCG</h1>
        <p className="text-gray-400 text-center mt-1">Online Play</p>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          {/* Nickname section */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <label className="block text-sm text-gray-400 mb-2">Your Name</label>
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editedNickname}
                  onChange={(e) => setEditedNickname(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNicknameSave()}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  maxLength={20}
                />
                <button
                  onClick={handleNicknameSave}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">{nickname}</span>
                <button
                  onClick={() => {
                    setEditedNickname(nickname);
                    setIsEditing(true);
                  }}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('play')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'play'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Play
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'saved'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Saved Games ({savedGames.length})
            </button>
          </div>

          {activeTab === 'play' && (
            <div className="space-y-4">
              {/* Waiting state */}
              {connectionStatus === 'waiting' && gameCode && (
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
                  <p className="text-gray-400 mb-2">Share this code with your opponent:</p>
                  <div className="text-4xl font-mono font-bold tracking-widest text-blue-400 mb-4">
                    {gameCode}
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{getStatusMessage(connectionStatus)}</p>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Connecting state */}
              {(connectionStatus === 'connecting' || connectionStatus === 'initializing') && (
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-400">{getStatusMessage(connectionStatus)}</p>
                </div>
              )}

              {/* Error state */}
              {connectionStatus === 'error' && (
                <div className="bg-red-900/30 rounded-lg p-4 border border-red-700 text-center">
                  <p className="text-red-400">{connectionError || 'Connection failed'}</p>
                  <button
                    onClick={handleCancel}
                    className="mt-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* Create/Join UI */}
              {connectionStatus === 'disconnected' && (
                <>
                  {/* Create Game */}
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h3 className="font-medium mb-3">Create Game</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      Create a new game and share the code with a friend.
                    </p>
                    <button
                      onClick={handleCreateGame}
                      className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors"
                    >
                      Create Game
                    </button>
                  </div>

                  {/* Join Game */}
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h3 className="font-medium mb-3">Join Game</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      Enter the code shared by your opponent.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleJoinGame()}
                        placeholder="Enter code"
                        className="flex-1 px-3 py-3 bg-gray-700 border border-gray-600 rounded-md text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                        maxLength={6}
                      />
                      <button
                        onClick={handleJoinGame}
                        disabled={!joinCode.trim()}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
                      >
                        Join
                      </button>
                    </div>
                  </div>

                  {/* Local Play option */}
                  <div className="text-center">
                    <button
                      onClick={onGameStart}
                      className="text-gray-400 hover:text-white text-sm transition-colors underline"
                    >
                      Play locally (hot-seat)
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="space-y-3">
              {savedGames.length === 0 ? (
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
                  <p className="text-gray-400">No saved games</p>
                </div>
              ) : (
                savedGames.map((game) => (
                  <div
                    key={game.id}
                    className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">vs {game.opponentNickname}</p>
                      <p className="text-sm text-gray-400">
                        {new Date(game.lastActivity).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteSavedGame(game.id)}
                        className="px-3 py-1 bg-red-600/30 hover:bg-red-600/50 text-red-400 rounded transition-colors text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-gray-700 text-center text-sm text-gray-500">
        Sorcery: Contested Realm is a trademark of Erik's Curiosa LLC
      </footer>
    </div>
  );
}
