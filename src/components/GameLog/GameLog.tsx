import { useState, useRef, useEffect } from 'react';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';
import { LogEntry } from '../../types/multiplayer';

export function GameLog() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    gameLog,
    connectionStatus,
    sendChat,
    sendRoll,
  } = useMultiplayerStore();

  const isMultiplayer = connectionStatus === 'connected';

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameLog, isOpen]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // Check for /random or /roll command
    const rollMatch = trimmed.match(/^\/(random|roll|r)\s+(\d+)$/i);
    if (rollMatch) {
      const max = parseInt(rollMatch[2], 10);
      if (max > 0 && max <= 1000000) {
        sendRoll(max);
      }
    } else if (!trimmed.startsWith('/')) {
      // Regular chat message
      sendChat(trimmed);
    }

    setInputValue('');
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getEntryColor = (entry: LogEntry): string => {
    switch (entry.type) {
      case 'chat':
        return entry.player === 'player' ? 'text-blue-300' : 'text-green-300';
      case 'roll':
        return 'text-yellow-300';
      case 'system':
        return 'text-gray-400';
      case 'action':
        return entry.player === 'player' ? 'text-blue-200' : 'text-green-200';
      default:
        return 'text-gray-300';
    }
  };

  const formatEntry = (entry: LogEntry): string => {
    const name = entry.nickname || (entry.player === 'player' ? 'You' : 'Opponent');

    switch (entry.type) {
      case 'chat':
        return `${name}: ${entry.message}`;
      case 'roll':
        return `${name} ${entry.message}`;
      case 'system':
        if (entry.nickname) {
          return `${entry.nickname} ${entry.message}`;
        }
        return entry.message;
      case 'action':
        return `${name} ${entry.message}`;
      default:
        return entry.message;
    }
  };

  // Badge for unread messages when closed
  const unreadCount = isOpen ? 0 : gameLog.length;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed bottom-4 right-4 z-40
          w-12 h-12 rounded-full
          flex items-center justify-center
          transition-all duration-200
          ${isOpen ? 'bg-gray-700 hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'}
          shadow-lg
        `}
        title={isOpen ? 'Close game log' : 'Open game log'}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* Log Panel */}
      <div
        className={`
          fixed bottom-20 right-4 z-40
          w-80 max-h-96
          bg-gray-800 border border-gray-700 rounded-lg shadow-xl
          flex flex-col
          transition-all duration-200 origin-bottom-right
          ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">Game Log</h3>
          {isMultiplayer && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              Connected
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 min-h-[200px] max-h-[300px]">
          {gameLog.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No activity yet
            </p>
          ) : (
            gameLog.map((entry) => (
              <div key={entry.id} className={`text-sm ${getEntryColor(entry)}`}>
                <span className="text-gray-500 text-xs mr-2">
                  {formatTime(entry.timestamp)}
                </span>
                {entry.type === 'roll' && (
                  <span className="mr-1">🎲</span>
                )}
                {formatEntry(entry)}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {isMultiplayer && (
          <form onSubmit={handleSubmit} className="p-2 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Chat or /random 20"
                className="flex-1 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                maxLength={200}
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white transition-colors"
              >
                Send
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              /random N to roll 1-N
            </p>
          </form>
        )}
      </div>
    </>
  );
}
