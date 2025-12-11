import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Player, CardInstance, getCardImageUrl } from '../../types';
import { useGameStore } from '../../hooks/useGameState';
import { useGameActions } from '../../hooks/useGameActions';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';
import { generateCardId } from '../../utils/cardTransform';
import { PREDEFINED_TOKENS, createTokenCardData, TokenDefinition } from './tokenData';

interface TokenModalProps {
  isOpen: boolean;
  player: Player;
  onClose: () => void;
}

export function TokenModal({ isOpen, player, onClose }: TokenModalProps) {
  const { hoverCard } = useGameStore();
  const { addToSpellStack } = useGameActions();
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
        onClose();
      }
    },
    [onClose]
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

  const handleSpawnToken = (token: TokenDefinition) => {
    const cardData = createTokenCardData(token);
    const newCard: CardInstance = {
      id: generateCardId(dataPlayer),
      cardData,
      variant: {
        slug: token.slug,
        finish: 'Standard',
        product: 'Token',
        artist: '',
        flavorText: '',
        typeText: token.type,
      },
      rotation: 0,
      owner: dataPlayer,
      isToken: true,
      isFullSizeToken: token.fullSize,
      isAttachable: token.attachable,
    };
    addToSpellStack(newCard, dataPlayer);
  };

  const handleTokenHover = (token: TokenDefinition) => {
    // Create a temporary card instance for hover preview
    const cardData = createTokenCardData(token);
    const tempCard: CardInstance = {
      id: 'preview',
      cardData,
      variant: {
        slug: token.slug,
        finish: 'Standard',
        product: 'Token',
        artist: '',
        flavorText: '',
        typeText: token.type,
      },
      rotation: 0,
      owner: dataPlayer,
      isToken: true,
    };
    hoverCard(tempCard);
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
            Spawn Token
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
            {PREDEFINED_TOKENS.map((token) => (
              <div
                key={token.slug}
                onClick={() => handleSpawnToken(token)}
                onMouseEnter={() => handleTokenHover(token)}
                onMouseLeave={() => hoverCard(null)}
                className="cursor-pointer hover:scale-105 transition-transform"
                title={`Click to spawn ${token.name}`}
              >
                <img
                  src={getCardImageUrl(token.slug)}
                  alt={token.name}
                  style={{
                    width: token.type === 'Site' ? '100px' : '71px',
                    height: token.type === 'Site' ? '67px' : '100px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    border: '2px solid #374151',
                  }}
                  draggable={false}
                  onError={(e) => {
                    // Fallback for missing images
                    const target = e.target as HTMLImageElement;
                    target.style.backgroundColor = '#4b5563';
                    target.style.display = 'flex';
                  }}
                />
                <div
                  style={{
                    fontSize: '10px',
                    color: '#9ca3af',
                    textAlign: 'center',
                    marginTop: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {token.name}
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs text-gray-500 text-center mt-2">
            Click a token to spawn it to the casting zone
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
    </div>,
    document.body
  );
}
