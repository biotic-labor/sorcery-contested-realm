import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useGameStore } from '../../hooks/useGameState';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';
import { CardInstance, Player } from '../../types';
import { SortableCard } from './SortableCard';
import { CardBack } from '../Card';

interface HandProps {
  player: Player;
  size?: 'xsmall' | 'small' | 'medium';
}

export function Hand({ player, size = 'medium' }: HandProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `hand-${player}` });

  const {
    playerHand,
    opponentHand,
    selectedCard,
    hoveredCard,
    selectCard,
    hoverCard,
  } = useGameStore();

  const { localPlayer, connectionStatus, gameCode } = useMultiplayerStore();
  // Use gameCode to check if we're in a multiplayer game (persists through disconnects)
  const isMultiplayer = connectionStatus === 'connected' || (connectionStatus === 'disconnected' && !!gameCode);

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

  const handleCardClick = (card: CardInstance) => {
    selectCard(selectedCard?.id === card.id ? null : card);
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
    <div
      ref={setNodeRef}
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
        <div className={`flex ${gap} overflow-x-auto pb-2`}>
          {hand.map((card) => (
            <CardBack key={card.id} size={size} deckType={card.sourceDeck} />
          ))}
        </div>
      ) : (
        // Show actual cards for local player
        <SortableContext items={hand.map(c => c.id)} strategy={horizontalListSortingStrategy}>
          <div className={`flex ${gap} overflow-x-auto pb-2`}>
            {hand.map((card, index) => (
              <SortableCard
                key={card.id}
                card={card}
                index={index}
                player={player}
                size={size}
                isSelected={selectedCard?.id === card.id}
                isHovered={hoveredCard?.id === card.id}
                onClick={() => handleCardClick(card)}
                onHover={hoverCard}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}
