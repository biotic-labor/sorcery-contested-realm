import { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useGameStore } from '../../hooks/useGameState';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';
import { peerService } from '../../services/peerService';
import { CardInstance, Player } from '../../types';
import { SortableCard } from './SortableCard';
import { CardBack } from '../Card';

interface HandProps {
  player: Player;
  size?: 'xsmall' | 'small' | 'medium';
}

interface ContextMenuState {
  x: number;
  y: number;
}

export function Hand({ player, size = 'medium' }: HandProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `hand-${player}` });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    playerHand,
    opponentHand,
    hoveredCard,
    hoverCard,
  } = useGameStore();

  const { localPlayer, connectionStatus, gameCode, nickname } = useMultiplayerStore();
  // Use gameCode to check if we're in a multiplayer game (persists through disconnects)
  const isMultiplayer = connectionStatus === 'connected' || (connectionStatus === 'disconnected' && !!gameCode);
  const isConnected = connectionStatus === 'connected';

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu]);

  // Perspective mapping - guest sees swapped data sources
  // Game state uses "player" for host's data, "opponent" for guest's data
  // UI uses player="player" for bottom (your hand), player="opponent" for top (their hand)
  const isGuest = isMultiplayer && localPlayer === 'opponent';
  const hand = player === 'player'
    ? (isGuest ? opponentHand : playerHand)   // Bottom hand: guest's cards are in opponentHand
    : (isGuest ? playerHand : opponentHand);  // Top hand: host's cards are in playerHand
  const isPlayerHand = player === 'player';

  // In multiplayer, determine if this is the local player's hand or the remote opponent's
  // Local player sees their cards, remote opponent's cards are hidden
  // player prop is UI position: "player" = bottom (your hand), "opponent" = top (their hand)
  // Bottom hand is always the local player's hand, top is always opponent's
  const isLocalPlayersHand = !isMultiplayer || player === 'player';
  const showAsCardBacks = isMultiplayer && !isLocalPlayersHand;

  const handleCardClick = (_card: CardInstance) => {
    // Click handler removed - no selection behavior
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    // Only show context menu for local player's hand in multiplayer
    if (!isLocalPlayersHand || !isConnected) return;

    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleRevealHand = () => {
    setContextMenu(null);
    // Send the actual hand cards to opponent
    peerService.send({
      type: 'reveal_hand',
      cards: hand,
      nickname: nickname,
    });
  };

  const minHeight = size === 'xsmall' ? 'min-h-[100px]' : size === 'small' ? 'min-h-[120px]' : 'min-h-[180px]';
  const padding = size === 'xsmall' || size === 'small' ? 'p-2' : 'p-4';
  const gap = size === 'xsmall' ? 'gap-1' : 'gap-2';

  if (hand.length === 0) {
    return (
      <div
        ref={setNodeRef}
        className={`
          flex items-center justify-center ${padding}
          ${isOver ? 'bg-blue-900 border-blue-400' : isPlayerHand ? 'bg-gray-800' : 'bg-gray-700'}
          rounded-lg border border-gray-600 ${minHeight}
          transition-colors duration-200
        `}
      >
        <span className="text-gray-500 text-sm">
          {isPlayerHand ? 'Your hand is empty' : "Opponent's hand is empty"}
        </span>
      </div>
    );
  }

  return (
    <>
      <div
        ref={setNodeRef}
        onContextMenu={handleContextMenu}
        className={`
          ${padding} rounded-lg border
          ${isOver ? 'bg-blue-900 border-blue-400' : `${isPlayerHand ? 'bg-gray-800' : 'bg-gray-700'} border-gray-600`}
          transition-colors duration-200
        `}
      >
        <div className="text-sm text-gray-400 mb-2">
          {isLocalPlayersHand ? 'Your Hand' : "Opponent's Hand"} ({hand.length} cards)
        </div>

        {showAsCardBacks ? (
          // Show card backs for opponent in multiplayer (site vs spell backs)
          <div className={`flex ${gap}`}>
            {hand.map((card) => (
              <CardBack key={card.id} size={size} deckType={card.sourceDeck} />
            ))}
          </div>
        ) : (
          // Show actual cards for local player
          <SortableContext items={hand.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            <div className={`flex ${gap}`}>
              {hand.map((card, index) => (
                <SortableCard
                  key={card.id}
                  card={card}
                  index={index}
                  player={player}
                  size={size}
                  isHovered={hoveredCard?.id === card.id}
                  onClick={() => handleCardClick(card)}
                  onHover={hoverCard}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>

      {/* Context menu for reveal hand */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed bg-gray-800 border border-gray-600 rounded shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={handleRevealHand}
            className="w-full px-4 py-2 text-left text-white hover:bg-gray-700"
          >
            Reveal Hand to Opponent
          </button>
        </div>
      )}
    </>
  );
}
