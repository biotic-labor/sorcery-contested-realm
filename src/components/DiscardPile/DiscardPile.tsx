import { useDroppable, useDraggable } from '@dnd-kit/core';
import { Player, CardInstance, getCardImageUrl } from '../../types';
import { useGameStore } from '../../hooks/useGameState';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';

interface DiscardPileProps {
  player: Player;
  cards: CardInstance[];
}

export function DiscardPile({ player, cards }: DiscardPileProps) {
  const { hoverCard } = useGameStore();
  const { localPlayer, connectionStatus } = useMultiplayerStore();
  const isMultiplayer = connectionStatus === 'connected';
  const isGuest = isMultiplayer && localPlayer === 'opponent';

  // Map UI player to data player for ownership check
  const dataPlayer = isGuest
    ? (player === 'player' ? 'opponent' : 'player')
    : player;

  const dropId = `discard-${player}`;

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: dropId,
  });

  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;

  // Only allow dragging own cards
  const canDrag = topCard && topCard.owner === dataPlayer;

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: topCard ? `graveyard-${topCard.id}` : 'graveyard-empty',
    data: { card: topCard, source: 'graveyard', sourcePlayer: dataPlayer },
    disabled: !canDrag,
  });

  const borderColor = isOver ? '#ef4444' : '#6b7280';

  return (
    <div
      ref={setDropRef}
      onContextMenu={(e) => e.preventDefault()}
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
        <div
          ref={setDragRef}
          {...(canDrag ? listeners : {})}
          {...(canDrag ? attributes : {})}
          onMouseEnter={() => hoverCard(topCard)}
          onMouseLeave={() => hoverCard(null)}
          style={{
            width: '100%',
            height: '100%',
            cursor: canDrag ? 'grab' : 'default',
            opacity: isDragging ? 0.5 : 1,
          }}
        >
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
        </div>
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
