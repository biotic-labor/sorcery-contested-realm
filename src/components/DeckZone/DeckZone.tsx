import { useState, useEffect } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { useGameStore } from '../../hooks/useGameState';
import { useGameActions } from '../../hooks/useGameActions';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';
import { Player, DeckType, CardInstance } from '../../types';
import { DeckContextMenu, DeckSearchModal } from '../DeckSearch';

interface DeckZoneProps {
  player: Player;
  deckType: DeckType;
  cards: CardInstance[];
  bottomAddTimestamp?: number;
}

const CARD_BACK_URLS = {
  site: '/assets/card-backs/cardback-atlas.png',
  spell: '/assets/card-backs/cardback-spellbook.png',
};

export function DeckZone({ player, deckType, cards, bottomAddTimestamp }: DeckZoneProps) {
  // Local state for context menu and search modal
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchCards, setSearchCards] = useState<CardInstance[]>([]);
  const [isBottomAdd, setIsBottomAdd] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);

  // Track shift key for bottom indicator
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Trigger lift animation when a card is added to bottom
  useEffect(() => {
    if (bottomAddTimestamp) {
      setIsBottomAdd(true);
      const timer = setTimeout(() => setIsBottomAdd(false), 300);
      return () => clearTimeout(timer);
    }
  }, [bottomAddTimestamp]);

  // Read-only state from store
  const { setHoveredDeck, shufflingDeck, peekDeck } = useGameStore();

  // Broadcasted actions
  const { shuffleDeck, returnCardsToDeck, putCardOnTop, putCardOnBottom, addToHand, addToSpellStack, placeCardOnSite } = useGameActions();

  // Perspective mapping for multiplayer
  const { localPlayer, connectionStatus, opponentSearching, sendSearchingDeck } = useMultiplayerStore();
  const isMultiplayer = connectionStatus === 'connected';
  const isGuest = isMultiplayer && localPlayer === 'opponent';

  // Map UI player to data player (guest's "player" deck is stored in "opponent" slot)
  const dataPlayer = isGuest
    ? (player === 'player' ? 'opponent' : 'player')
    : player;

  // Check if opponent is searching this deck (need to map opponent's player to UI position)
  const isOpponentSearching =
    opponentSearching &&
    opponentSearching.deckType === deckType &&
    // Opponent's "player" is our "opponent" UI slot
    (isGuest
      ? (opponentSearching.player === 'player' ? 'opponent' : 'player')
      : opponentSearching.player) === player;

  const isShuffling = shufflingDeck?.player === dataPlayer && shufflingDeck?.deckType === deckType;
  const dropId = `deck-${player}-${deckType}`;
  const dragId = `deck-drag-${player}-${deckType}`;

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: dropId,
  });

  // Get top card for dragging
  const topCard = cards[0];

  // Only allow dragging from player's own deck
  const canDrag = player === 'player' && cards.length > 0;

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: dragId,
    data: {
      card: topCard,
      source: 'deck',
      deckType,
      player: dataPlayer,
    },
    disabled: !canDrag,
  });

  // Combine refs for both droppable and draggable
  const setNodeRef = (node: HTMLElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  const cardBackUrl = CARD_BACK_URLS[deckType];
  const borderColor = isOver ? '#22c55e' : '#6b7280';

  const handleShuffle = () => {
    shuffleDeck(dataPlayer, deckType);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Only allow searching own deck
    if (player !== 'player') return;
    if (cards.length === 0) return;
    // Prevent opening context menu if search is already open
    if (isSearchModalOpen) return;
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleContextMenuSelect = (count: number) => {
    // Prevent double-click from opening search twice
    if (isSearchModalOpen) return;

    setContextMenuPos(null);
    const actualCount = count === -1 ? cards.length : count;
    const peekedCards = peekDeck(dataPlayer, deckType, actualCount);
    setSearchCards(peekedCards);
    setIsSearchModalOpen(true);
    if (isMultiplayer) {
      sendSearchingDeck(deckType, true, actualCount);
    }
  };

  const handleCloseSearchModal = () => {
    setIsSearchModalOpen(false);
    setSearchCards([]);
    if (isMultiplayer) {
      sendSearchingDeck(deckType, false);
    }
  };

  const handleReturnCards = (cardsToReturn: CardInstance[], position: 'top' | 'bottom') => {
    returnCardsToDeck(cardsToReturn, dataPlayer, deckType, position);
    handleCloseSearchModal();
  };

  const handleSendCardToDeck = (card: CardInstance, position: 'top' | 'bottom') => {
    if (position === 'top') {
      putCardOnTop(card, dataPlayer, deckType);
    } else {
      putCardOnBottom(card, dataPlayer, deckType);
    }
  };

  const handleAddToHand = (card: CardInstance) => {
    addToHand(card, dataPlayer);
  };

  const handlePlayToBoard = (card: CardInstance) => {
    const cardType = card.cardData.guardian?.type;

    if (cardType === 'Site') {
      // Sites go directly to the board at bottom-right (row 3, col 4)
      const position = { row: 3, col: 4 };
      placeCardOnSite(card, position);
    } else {
      // Spells, Minions, Auras, Artifacts, Magics go to the spell stack (casting zone)
      addToSpellStack(card, dataPlayer);
    }
  };

  return (
    <>
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onMouseEnter={() => setHoveredDeck({ player, deckType })}
      onMouseLeave={() => setHoveredDeck(null)}
      onContextMenu={handleContextMenu}
      className={isBottomAdd ? 'deck-bottom-add' : ''}
      style={{
        width: '80px',
        height: '110px',
        backgroundImage: `url(${cardBackUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: `2px solid ${borderColor}`,
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: canDrag ? 'grab' : 'pointer',
        transition: 'border-color 0.15s ease',
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {/* Spinning cards during shuffle */}
      {isShuffling && (
        <>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '50px',
                height: '70px',
                backgroundImage: `url(${cardBackUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '2px solid #6b7280',
                borderRadius: '4px',
                animation: 'shuffleSpin 0.6s ease-in-out',
                animationDelay: `${i * 0.1}s`,
                transformOrigin: 'center center',
                zIndex: i,
              }}
            />
          ))}
        </>
      )}

      {/* Card count */}
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#fff',
          zIndex: 10,
        }}
      >
        {cards.length}
      </div>

      {/* Shuffle button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleShuffle();
        }}
        style={{
          position: 'absolute',
          bottom: '4px',
          right: '4px',
          width: '20px',
          height: '20px',
          borderRadius: '4px',
          backgroundColor: '#1f2937',
          border: '1px solid #4b5563',
          color: '#9ca3af',
          fontSize: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Shuffle deck"
        className="hover:bg-gray-600"
      >
        S
      </button>

      {/* Drop indicator */}
      {isOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: shiftHeld ? 'rgba(251, 191, 36, 0.3)' : 'rgba(34, 197, 94, 0.2)',
            borderRadius: '4px',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
          }}
        >
          {shiftHeld && (
            <span style={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: '#fbbf24',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
            }}>
              Bottom
            </span>
          )}
        </div>
      )}

      {/* Opponent searching indicator */}
      {isOpponentSearching && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              width: '24px',
              height: '24px',
              color: '#fbbf24',
              animation: 'blink 1s ease-in-out infinite',
            }}
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {opponentSearching?.count && (
            <div style={{ fontSize: '10px', color: '#fbbf24', marginTop: '2px' }}>
              {opponentSearching.count === -1 ? 'All' : opponentSearching.count}
            </div>
          )}
        </div>
      )}

      {/* Hotkey hint */}
      <div
        style={{
          position: 'absolute',
          top: '4px',
          left: '4px',
          fontSize: '8px',
          color: '#6b7280',
        }}
      >
        1-9
      </div>
    </div>

    {/* Context menu */}
    {contextMenuPos && (
      <DeckContextMenu
        x={contextMenuPos.x}
        y={contextMenuPos.y}
        deckSize={cards.length}
        onSelect={handleContextMenuSelect}
        onClose={() => setContextMenuPos(null)}
      />
    )}

    {/* Search modal */}
    <DeckSearchModal
      isOpen={isSearchModalOpen}
      cards={searchCards}
      deckType={deckType}
      onClose={handleCloseSearchModal}
      onReturnCards={handleReturnCards}
      onSendCardToDeck={handleSendCardToDeck}
      onAddToHand={handleAddToHand}
      onPlayToBoard={handlePlayToBoard}
    />

    {/* CSS for animations */}
    <style>{`
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      @keyframes deck-lift {
        0% { transform: translateY(0); }
        40% { transform: translateY(-8px); }
        100% { transform: translateY(0); }
      }
      .deck-bottom-add {
        animation: deck-lift 0.3s ease-out;
      }
    `}</style>
    </>
  );
}
