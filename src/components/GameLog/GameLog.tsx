import { useState, useRef, useEffect, useCallback } from 'react';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';
import { LogEntry } from '../../types/multiplayer';

const STORAGE_KEY = 'gameLogPrefs';
const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 384;
const MIN_WIDTH = 250;
const MIN_HEIGHT = 200;
const MAX_WIDTH = 600;
const MAX_HEIGHT = 600;

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface StoredPrefs {
  position: Position;
  size: Size;
}

function loadPrefs(): StoredPrefs | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function savePrefs(prefs: StoredPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}

export function GameLog() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Position and size state
  const [position, setPosition] = useState<Position>(() => {
    const prefs = loadPrefs();
    return prefs?.position ?? { x: window.innerWidth - DEFAULT_WIDTH - 16, y: window.innerHeight - DEFAULT_HEIGHT - 80 };
  });
  const [size, setSize] = useState<Size>(() => {
    const prefs = loadPrefs();
    return prefs?.size ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  });

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const dragStart = useRef<{ x: number; y: number; posX: number; posY: number }>({ x: 0, y: 0, posX: 0, posY: 0 });
  const resizeStart = useRef<{ x: number; y: number; width: number; height: number; posX: number; posY: number }>({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });

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

  // Save preferences when position or size changes
  useEffect(() => {
    if (isOpen) {
      savePrefs({ position, size });
    }
  }, [position, size, isOpen]);

  // Clamp position to keep panel visible
  const clampPosition = useCallback((pos: Position, panelSize: Size): Position => {
    const maxX = window.innerWidth - panelSize.width;
    const maxY = window.innerHeight - panelSize.height;
    return {
      x: Math.max(0, Math.min(pos.x, maxX)),
      y: Math.max(0, Math.min(pos.y, maxY)),
    };
  }, []);

  // Handle drag start on header
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  }, [position]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(direction);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y,
    };
  }, [size, position]);

  // Global mouse move and up handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        const newPos = {
          x: dragStart.current.posX + dx,
          y: dragStart.current.posY + dy,
        };
        setPosition(clampPosition(newPos, size));
      } else if (isResizing) {
        const dx = e.clientX - resizeStart.current.x;
        const dy = e.clientY - resizeStart.current.y;
        let newWidth = resizeStart.current.width;
        let newHeight = resizeStart.current.height;
        let newPosX = resizeStart.current.posX;
        let newPosY = resizeStart.current.posY;

        if (isResizing.includes('e')) {
          newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStart.current.width + dx));
        }
        if (isResizing.includes('w')) {
          const widthChange = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStart.current.width - dx)) - resizeStart.current.width;
          newWidth = resizeStart.current.width + widthChange;
          newPosX = resizeStart.current.posX - widthChange;
        }
        if (isResizing.includes('s')) {
          newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, resizeStart.current.height + dy));
        }
        if (isResizing.includes('n')) {
          const heightChange = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, resizeStart.current.height - dy)) - resizeStart.current.height;
          newHeight = resizeStart.current.height + heightChange;
          newPosY = resizeStart.current.posY - heightChange;
        }

        setSize({ width: newWidth, height: newHeight });
        setPosition(clampPosition({ x: newPosX, y: newPosY }, { width: newWidth, height: newHeight }));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, size, clampPosition]);

  // Handle window resize to keep panel in bounds
  useEffect(() => {
    const handleWindowResize = () => {
      setPosition(prev => clampPosition(prev, size));
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [size, clampPosition]);

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
        ref={panelRef}
        style={{
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
        }}
        className={`
          fixed z-40
          bg-gray-800 border border-gray-700 rounded-lg shadow-xl
          flex flex-col
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          ${isDragging || isResizing ? '' : 'transition-opacity duration-200'}
        `}
      >
        {/* Resize handles */}
        {isOpen && (
          <>
            {/* Edge handles */}
            <div
              className="absolute top-0 left-2 right-2 h-1 cursor-n-resize hover:bg-blue-500/30"
              onMouseDown={(e) => handleResizeStart(e, 'n')}
            />
            <div
              className="absolute bottom-0 left-2 right-2 h-1 cursor-s-resize hover:bg-blue-500/30"
              onMouseDown={(e) => handleResizeStart(e, 's')}
            />
            <div
              className="absolute left-0 top-2 bottom-2 w-1 cursor-w-resize hover:bg-blue-500/30"
              onMouseDown={(e) => handleResizeStart(e, 'w')}
            />
            <div
              className="absolute right-0 top-2 bottom-2 w-1 cursor-e-resize hover:bg-blue-500/30"
              onMouseDown={(e) => handleResizeStart(e, 'e')}
            />
            {/* Corner handles */}
            <div
              className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize hover:bg-blue-500/30"
              onMouseDown={(e) => handleResizeStart(e, 'nw')}
            />
            <div
              className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize hover:bg-blue-500/30"
              onMouseDown={(e) => handleResizeStart(e, 'ne')}
            />
            <div
              className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize hover:bg-blue-500/30"
              onMouseDown={(e) => handleResizeStart(e, 'sw')}
            />
            <div
              className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize hover:bg-blue-500/30"
              onMouseDown={(e) => handleResizeStart(e, 'se')}
            />
          </>
        )}

        {/* Header - draggable */}
        <div
          className={`px-3 py-2 border-b border-gray-700 flex items-center justify-between select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleDragStart}
        >
          <h3 className="text-sm font-medium text-white">Game Log</h3>
          <div className="flex items-center gap-2">
            {isMultiplayer && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                Connected
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-gray-400 hover:text-white transition-colors"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
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
                  <span className="mr-1">dice:</span>
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
