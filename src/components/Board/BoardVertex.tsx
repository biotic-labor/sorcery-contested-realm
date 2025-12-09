import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { vertexKey, CardInstance } from '../../types';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';
import { DraggableBoardCard } from './DraggableBoardCard';

interface BoardVertexProps {
  row: number;
  col: number;
  units: CardInstance[];
  onCardClick?: (card: CardInstance) => void;
  onCardHover?: (card: CardInstance | null) => void;
  onVertexHover?: (vertexId: string | null) => void;
  selectedCardId?: string;
  hoveredCardId?: string;
}

export function BoardVertex({
  row,
  col,
  units,
  onCardClick,
  onCardHover,
  onVertexHover,
  selectedCardId,
  hoveredCardId,
}: BoardVertexProps) {
  const id = vertexKey(row, col);
  const { isOver, setNodeRef } = useDroppable({ id });

  // Get multiplayer state to determine card ownership
  const { localPlayer, connectionStatus } = useMultiplayerStore();
  const isMultiplayer = connectionStatus === 'connected';

  // When board is rotated (guest), flip the card rotation logic
  const isBoardRotated = isMultiplayer && localPlayer === 'opponent';
  const isOpponentCard = (card: CardInstance) =>
    isMultiplayer && (isBoardRotated ? card.owner === localPlayer : card.owner !== localPlayer);

  // Notify parent when drag hover state changes
  const prevIsOver = React.useRef(false);
  React.useEffect(() => {
    if (isOver !== prevIsOver.current) {
      prevIsOver.current = isOver;
      onVertexHover?.(isOver ? id : null);
    }
  }, [isOver, id, onVertexHover]);

  return (
    <div
      ref={setNodeRef}
      style={{
        width: '80px',
        height: '80px',
        pointerEvents: 'auto',
        position: 'relative',
      }}
    >
      {/* Units stacked on vertex - centered at the middle of this zone */}
      {units.map((unit, index) => (
        <div
          key={unit.id}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translateY(${index * -20}px) translateX(${index * 12}px)`,
            zIndex: 25 + index,
          }}
        >
          <DraggableBoardCard
            card={unit}
            sourcePosition={id}
            isSelected={selectedCardId === unit.id}
            isHovered={hoveredCardId === unit.id}
            onClick={() => onCardClick?.(unit)}
            onHover={onCardHover}
            isOpponentCard={isOpponentCard(unit)}
          />
        </div>
      ))}
    </div>
  );
}
