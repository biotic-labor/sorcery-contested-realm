import { useDroppable, useDraggable } from '@dnd-kit/core';
import { useGameStore } from '../../hooks/useGameState';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';
import { Player, getCardImageUrl } from '../../types';

interface SpellStackProps {
  player: Player;
}

export function SpellStack({ player }: SpellStackProps) {
  const dropId = `spell-stack-${player}`;
  const { isOver, setNodeRef: setDropRef } = useDroppable({ id: dropId });

  const { playerSpellStack, opponentSpellStack, hoverCard } = useGameStore();
  const { localPlayer, connectionStatus, gameCode } = useMultiplayerStore();
  const isMultiplayer = connectionStatus === 'connected' || (connectionStatus === 'disconnected' && !!gameCode);
  const isGuest = isMultiplayer && localPlayer === 'opponent';

  // Perspective mapping
  const stack = player === 'player'
    ? (isGuest ? opponentSpellStack : playerSpellStack)
    : (isGuest ? playerSpellStack : opponentSpellStack);

  // Get the data player for drag source info
  const dataPlayer = isGuest
    ? (player === 'player' ? 'opponent' : 'player')
    : player;

  const topCard = stack.length > 0 ? stack[stack.length - 1] : null;
  const isPlayerStack = player === 'player';

  // Only allow dragging from your own spell stack
  const canDrag = isPlayerStack && topCard !== null;

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: topCard?.id || 'spell-stack-empty',
    data: {
      card: topCard,
      source: 'spell-stack',
      sourcePlayer: dataPlayer,
    },
    disabled: !canDrag,
  });

  return (
    <div
      ref={setDropRef}
      style={{
        width: '80px',
        height: '112px',
        border: `2px dashed ${isOver ? '#22c55e' : '#4b5563'}`,
        borderRadius: '8px',
        backgroundColor: isOver ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'border-color 0.15s, background-color 0.15s',
      }}
    >
      {topCard ? (
        <div
          ref={setDragRef}
          {...(canDrag ? { ...attributes, ...listeners } : {})}
          onMouseEnter={() => hoverCard(topCard)}
          onMouseLeave={() => hoverCard(null)}
          style={{
            width: '76px',
            height: '106px',
            cursor: canDrag ? 'grab' : 'default',
            opacity: isDragging ? 0.5 : 1,
          }}
        >
          <img
            src={getCardImageUrl(topCard.variant.slug)}
            alt={topCard.cardData.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '6px',
            }}
            draggable={false}
          />
        </div>
      ) : (
        <span style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center' }}>
          {isPlayerStack ? 'Cast' : 'Opponent'}
        </span>
      )}
      {stack.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '10px',
            color: '#fff',
          }}
        >
          {stack.length}
        </div>
      )}
    </div>
  );
}
