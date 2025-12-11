import { useState } from 'react';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';
import { ConnectionStatus } from '../../types/multiplayer';
import { PublicGamesList } from './PublicGamesList';
import { ActiveGamesList } from './ActiveGamesList';

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
    isHost,
    isPublicGame,
    createGame,
    createPublicGame,
    cancelPublicGame,
    joinGame,
    reconnectAsHost,
    reconnectAsGuest,
    clearSession,
    disconnect,
  } = useMultiplayerStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editedNickname, setEditedNickname] = useState(nickname);
  const [joinCode, setJoinCode] = useState('');

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

  const handleCreatePublicGame = async () => {
    try {
      await createPublicGame();
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

  const handleJoinPublicGame = async (code: string) => {
    try {
      await joinGame(code);
      onGameStart();
    } catch (error) {
      // Error is handled in the store
    }
  };

  const handleCancel = () => {
    disconnect();
  };

  const handleCancelPublicGame = async () => {
    await cancelPublicGame();
  };

  const handleReconnect = async () => {
    try {
      if (isHost) {
        await reconnectAsHost();
      } else {
        await reconnectAsGuest();
        onGameStart();
      }
    } catch (error) {
      // Error handled in store
    }
  };

  const handleAbandonSession = () => {
    clearSession();
  };

  // Check if there's an existing session to reconnect to
  const hasExistingSession = connectionStatus === 'disconnected' && gameCode;

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

          <div className="space-y-4">
              {/* Waiting state - Private game */}
              {connectionStatus === 'waiting' && gameCode && !isPublicGame && (
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

              {/* Waiting state - Public game */}
              {connectionStatus === 'waiting' && gameCode && isPublicGame && (
                <div className="bg-gray-800 rounded-lg p-6 border border-green-700 text-center">
                  <div className="animate-pulse mb-4">
                    <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto animate-spin" />
                  </div>
                  <p className="text-lg font-medium text-green-400 mb-2">Searching for opponent...</p>
                  <p className="text-sm text-gray-500 mb-4">You are in the public queue</p>
                  <button
                    onClick={handleCancelPublicGame}
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
                  {/* Reconnect to existing session */}
                  {hasExistingSession && (
                    <div className="bg-yellow-900/30 rounded-lg p-4 border border-yellow-700">
                      <h3 className="font-medium mb-2 text-yellow-400">Game In Progress</h3>
                      <p className="text-sm text-gray-300 mb-1">
                        You have an existing game session ({isHost ? 'host' : 'guest'})
                      </p>
                      {!isHost && (
                        <p className="text-xs text-gray-400 mb-2">
                          Host must reconnect first before you can rejoin
                        </p>
                      )}
                      <div className="text-2xl font-mono font-bold tracking-widest text-yellow-400 mb-4 text-center">
                        {gameCode}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleReconnect}
                          className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md font-medium transition-colors"
                        >
                          Reconnect
                        </button>
                        <button
                          onClick={handleAbandonSession}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                        >
                          Abandon
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Create Game Options */}
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h3 className="font-medium mb-3">Create Game</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleCreateGame}
                        className="px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors"
                      >
                        Play with Friend
                      </button>
                      <button
                        onClick={handleCreatePublicGame}
                        className="px-4 py-3 bg-green-600 hover:bg-green-700 rounded-md font-medium transition-colors"
                      >
                        Find Match
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Friend: share a code | Match: join public queue
                    </p>
                  </div>

                  {/* Available Public Games */}
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h3 className="font-medium mb-3">Available Games</h3>
                    <PublicGamesList onJoinGame={handleJoinPublicGame} />
                  </div>

                  {/* Active Games */}
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h3 className="font-medium mb-3">Active Games</h3>
                    <ActiveGamesList />
                  </div>

                  {/* Join with Code */}
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h3 className="font-medium mb-3">Join with Code</h3>
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
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
                      >
                        Join
                      </button>
                    </div>
                  </div>

                </>
              )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-gray-700 text-center text-sm text-gray-500">
        Sorcery: Contested Realm is a trademark of Erik's Curiosa LLC
      </footer>
    </div>
  );
}
