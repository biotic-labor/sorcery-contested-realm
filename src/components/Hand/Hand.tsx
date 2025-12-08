import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useGameStore } from '../../hooks/useGameState';
import { CardInstance, Player } from '../../types';
import { SortableCard } from './SortableCard';

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

  const hand = player === 'player' ? playerHand : opponentHand;
  const isPlayerHand = player === 'player';

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
        {isPlayerHand ? 'Your Hand' : "Opponent's Hand"} ({hand.length} cards)
      </div>

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
    </div>
  );
}
