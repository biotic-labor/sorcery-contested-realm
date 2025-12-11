import { useDraggable } from '@dnd-kit/core';
import { CardInstance } from '../../types';
import { Card } from '../Card';

interface DraggableCardProps {
  card: CardInstance;
  onClick?: () => void;
  onHover?: (card: CardInstance | null) => void;
  isHovered?: boolean;
}

export function DraggableCard({
  card,
  onClick,
  onHover,
  isHovered,
}: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { card, source: 'hand' },
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
        size="medium"
        isHovered={isHovered}
        onClick={onClick}
        onMouseEnter={() => onHover?.(card)}
        onMouseLeave={() => onHover?.(null)}
      />
    </div>
  );
}
