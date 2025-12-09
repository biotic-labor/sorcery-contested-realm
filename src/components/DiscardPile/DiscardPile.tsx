import { useDroppable } from '@dnd-kit/core';
import { Player, CardInstance, getCardImageUrl } from '../../types';
import { useGameStore } from '../../hooks/useGameState';

interface DiscardPileProps {
  player: Player;
  cards: CardInstance[];
}

export function DiscardPile({ player, cards }: DiscardPileProps) {
  const { hoverCard } = useGameStore();
  const dropId = `discard-${player}`;

  const { isOver, setNodeRef } = useDroppable({
    id: dropId,
  });

  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  const borderColor = isOver ? '#ef4444' : '#6b7280';

  return (
    <div
      ref={setNodeRef}
      onContextMenu={(e) => e.preventDefault()}
      onMouseEnter={() => topCard && hoverCard(topCard)}
      onMouseLeave={() => hoverCard(null)}
      style={{
        width: '80px',
        height: '110px',
        backgroundColor: '#1f2937',
        border: `2px solid ${borderColor}`,
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {topCard ? (
        <>
          {/* Top card image */}
          <img
            src={getCardImageUrl(topCard.variant.slug)}
            alt={topCard.cardData.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '4px',
            }}
          />
          {/* Card count badge */}
          <div
            style={{
              position: 'absolute',
              bottom: '4px',
              right: '4px',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 'bold',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
            {cards.length}
          </div>
        </>
      ) : (
        <>
          {/* Empty state */}
          <div
            style={{
              fontSize: '10px',
              color: '#6b7280',
              textTransform: 'uppercase',
            }}
          >
            Discard
          </div>
          <div
            style={{
              fontSize: '20px',
              color: '#4b5563',
              marginTop: '4px',
            }}
          >
            0
          </div>
        </>
      )}

      {/* Drop indicator */}
      {isOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            borderRadius: '4px',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
