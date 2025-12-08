import { useDraggable } from '@dnd-kit/core';
import { CardInstance } from '../../types';
import { Card } from '../Card';

interface DraggableBoardCardProps {
  card: CardInstance;
  sourcePosition: string; // "row-col" format
  onClick?: () => void;
  onHover?: (card: CardInstance | null) => void;
  isSelected?: boolean;
  isHovered?: boolean;
  showAsHorizontal?: boolean;
}

export function DraggableBoardCard({
  card,
  sourcePosition,
  onClick,
  onHover,
  isSelected,
  isHovered,
  showAsHorizontal,
}: DraggableBoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `board-${card.id}`,
    data: { card, source: 'board', sourcePosition },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : undefined,
      }
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
      />
    </div>
  );
}
