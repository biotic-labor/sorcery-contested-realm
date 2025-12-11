import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CardInstance, Player } from '../../types';
import { Card } from '../Card';

interface SortableCardProps {
  card: CardInstance;
  index: number;
  player: Player;
  size?: 'xsmall' | 'small' | 'medium';
  onClick?: () => void;
  onHover?: (card: CardInstance | null) => void;
  isHovered?: boolean;
}

export function SortableCard({
  card,
  index,
  player,
  size = 'medium',
  onClick,
  onHover,
  isHovered,
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { card, source: 'hand', index, player },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        ${isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-grab'}
      `}
    >
      <Card
        card={card}
        size={size}
        isHovered={isHovered}
        onClick={onClick}
        onMouseEnter={() => onHover?.(card)}
        onMouseLeave={() => onHover?.(null)}
      />
    </div>
  );
}
