import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CardInstance, Player, getCardImageUrl } from '../../types';
import { useGameStore } from '../../hooks/useGameState';
import { useGameActions } from '../../hooks/useGameActions';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';

interface CollectionSearchModalProps {
  isOpen: boolean;
  cards: CardInstance[];
  player: Player;
  onClose: () => void;
}

interface CardContextMenuProps {
  x: number;
  y: number;
  onAddToHand: () => void;
  onPlayToBoard: () => void;
  onClose: () => void;
}

function CardContextMenu({ x, y, onAddToHand, onPlayToBoard, onClose }: CardContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 2000,
        backgroundColor: '#1f2937',
        border: '1px solid #374151',
        borderRadius: '6px',
        padding: '4px 0',
        minWidth: '140px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      <button
        onClick={onAddToHand}
        style={{
          display: 'block',
          width: '100%',
          padding: '8px 12px',
          textAlign: 'left',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#e5e7eb',
          cursor: 'pointer',
          fontSize: '14px',
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#374151')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        Add to hand
      </button>
      <button
        onClick={onPlayToBoard}
        style={{
          display: 'block',
          width: '100%',
          padding: '8px 12px',
          textAlign: 'left',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#e5e7eb',
          cursor: 'pointer',
          fontSize: '14px',
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#374151')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        Play to board
      </button>
    </div>
  );
}

export function CollectionSearchModal({
  isOpen,
  cards,
  player,
  onClose,
}: CollectionSearchModalProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; card: CardInstance } | null>(null);

  const { hoverCard } = useGameStore();
  const { removeFromCollection, addToHand, addToSpellStack } = useGameActions();
  const { localPlayer, connectionStatus } = useMultiplayerStore();
  const isMultiplayer = connectionStatus === 'connected';
  const isGuest = isMultiplayer && localPlayer === 'opponent';

  // Map UI player to data player
  const dataPlayer = isGuest
    ? (player === 'player' ? 'opponent' : 'player')
    : player;

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (contextMenu) {
          setContextMenu(null);
        } else {
          onClose();
        }
      }
    },
    [onClose, contextMenu]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  const handleCardContextMenu = (e: React.MouseEvent, card: CardInstance) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, card });
  };

  const handleAddToHand = () => {
    if (contextMenu) {
      const card = contextMenu.card;
      removeFromCollection(card.id, dataPlayer);
      addToHand(card, dataPlayer);
      setContextMenu(null);
    }
  };

  const handlePlayToBoard = () => {
    if (contextMenu) {
      const card = contextMenu.card;
      removeFromCollection(card.id, dataPlayer);
      addToSpellStack(card, dataPlayer);
      setContextMenu(null);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative z-10 w-full max-w-3xl mx-4 bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            Collection ({cards.length} cards)
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-gray-700"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {cards.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              Collection is empty
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 100px)',
                gap: '12px',
                justifyContent: 'center',
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '8px',
              }}
            >
              {cards.map((card) => (
                <div
                  key={card.id}
                  onContextMenu={(e) => handleCardContextMenu(e, card)}
                  onMouseEnter={() => hoverCard(card)}
                  onMouseLeave={() => hoverCard(null)}
                  className="cursor-pointer"
                >
                  <img
                    src={getCardImageUrl(card.variant.slug)}
                    alt={card.cardData.name}
                    style={{
                      width: '100px',
                      height: '140px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      border: '2px solid #374151',
                    }}
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-gray-500 text-center mt-2">
            Right-click a card to add to hand or play to board
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-center gap-4 px-4 py-3 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Card context menu */}
      {contextMenu && (
        <CardContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onAddToHand={handleAddToHand}
          onPlayToBoard={handlePlayToBoard}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>,
    document.body
  );
}
