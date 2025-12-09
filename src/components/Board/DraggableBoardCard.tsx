import { useDraggable } from '@dnd-kit/core';
import { CardInstance } from '../../types';
import { Card } from '../Card';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';

interface DraggableBoardCardProps {
  card: CardInstance;
  sourcePosition: string; // "row-col" format
  onClick?: () => void;
  onHover?: (card: CardInstance | null) => void;
  isSelected?: boolean;
  isHovered?: boolean;
  showAsHorizontal?: boolean;
  isOpponentCard?: boolean; // Rotate 180deg if this card belongs to opponent
  onContextMenu?: (e: React.MouseEvent, card: CardInstance) => void;
  onCounterIncrement?: () => void;
  onCounterDecrement?: () => void;
}

export function DraggableBoardCard({
  card,
  sourcePosition,
  onClick,
  onHover,
  isSelected,
  isHovered,
  showAsHorizontal,
  isOpponentCard = false,
  onContextMenu,
  onCounterIncrement,
  onCounterDecrement,
}: DraggableBoardCardProps) {
  // Check actual ownership for drag permission (not visual rotation)
  const { localPlayer, connectionStatus } = useMultiplayerStore();
  const isMultiplayer = connectionStatus === 'connected';
  const isMyCard = card.owner === localPlayer;
  const canDrag = !isMultiplayer || isMyCard;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `board-${card.id}`,
    data: { card, source: 'board', sourcePosition },
    disabled: !canDrag,
  });

  // Opponent's cards are rotated 180deg so they face the opponent
  const ownerRotation = isOpponentCard ? 'rotate(180deg)' : '';
  const style = transform
    ? {
        transform: `${ownerRotation} translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : undefined,
      }
    : isOpponentCard
    ? { transform: ownerRotation }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        transition-transform duration-100
        ${isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-grab'}
      `}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e, card);
        }
      }}
    >
      <Card
        card={card}
        size="small"
        showAsHorizontal={showAsHorizontal}
        isSelected={isSelected}
        isHovered={isHovered}
        onClick={onClick}
        onMouseEnter={() => onHover?.(card)}
        onMouseLeave={() => onHover?.(null)}
        onCounterIncrement={onCounterIncrement}
        onCounterDecrement={onCounterDecrement}
      />
    </div>
  );
}
