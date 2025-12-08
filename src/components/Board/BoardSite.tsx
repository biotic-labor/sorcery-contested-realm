import { useDroppable } from '@dnd-kit/core';
import { BoardSite as BoardSiteType, positionKey, CardInstance } from '../../types';
import { DraggableBoardCard } from './DraggableBoardCard';

interface BoardSiteProps {
  site: BoardSiteType;
  row: number;
  col: number;
  avatar?: CardInstance;
  onCardClick?: (card: CardInstance) => void;
  onCardHover?: (card: CardInstance | null) => void;
  selectedCardId?: string;
  hoveredCardId?: string;
  isAvatarZone?: boolean;
  avatarZoneOwner?: 'player' | 'opponent';
  isHighlightedByVertex?: boolean;
}

export function BoardSite({
  site,
  row,
  col,
  avatar,
  onCardClick,
  onCardHover,
  selectedCardId,
  hoveredCardId,
  isAvatarZone = false,
  avatarZoneOwner,
  isHighlightedByVertex = false,
}: BoardSiteProps) {
  const id = positionKey(row, col);
  const { isOver, setNodeRef } = useDroppable({ id });

  const hasContent = site.siteCard || site.units.length > 0 || avatar;
  const showAvatarPlaceholder = isAvatarZone && !avatar;
  const isHighlighted = isOver || isHighlightedByVertex;

  return (
    <div
      ref={setNodeRef}
      className={`
        relative border border-gray-600 rounded-lg
        transition-colors duration-200
        ${isHighlighted ? 'bg-green-900 border-green-400' : 'bg-gray-800'}
        ${!hasContent ? 'bg-opacity-50' : ''}
      `}
      style={{ width: '160px', height: '120px' }}
    >
      {/* Grid position label (1-20 for dice rolls) */}
      <div className="absolute top-1 left-1 text-xs text-gray-500 font-mono" style={{ zIndex: 0 }}>
        {row * 5 + col + 1}
      </div>

      {/* Avatar placeholder */}
      {showAvatarPlaceholder && (
        <div
          className="absolute flex items-center justify-center"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '66px',
            height: '93px',
            border: '2px dashed',
            borderColor: avatarZoneOwner === 'player' ? '#4ade80' : '#f87171',
            borderRadius: '6px',
            zIndex: 1,
          }}
        >
          <span
            className="text-xs text-center"
            style={{ color: avatarZoneOwner === 'player' ? '#4ade80' : '#f87171' }}
          >
            Avatar
          </span>
        </div>
      )}

      {/* Site card (horizontal, as background) */}
      {site.siteCard && (
        <div className="absolute inset-1" style={{ zIndex: 1 }}>
          <DraggableBoardCard
            card={site.siteCard}
            sourcePosition={id}
            showAsHorizontal
            isSelected={selectedCardId === site.siteCard.id}
            isHovered={hoveredCardId === site.siteCard.id}
            onClick={() => onCardClick?.(site.siteCard!)}
            onHover={onCardHover}
          />
        </div>
      )}

      {/* Units stacked on site */}
      {site.units.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
          <div className="relative">
            {site.units.map((unit, index) => (
              <div
                key={unit.id}
                className="absolute"
                style={{
                  transform: `translateY(${index * -25}px) translateX(${index * 15}px)`,
                  zIndex: index + 1,
                }}
              >
                <DraggableBoardCard
                  card={unit}
                  sourcePosition={id}
                  isSelected={selectedCardId === unit.id}
                  isHovered={hoveredCardId === unit.id}
                  onClick={() => onCardClick?.(unit)}
                  onHover={onCardHover}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Avatar on site */}
      {avatar && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 3 }}>
          <DraggableBoardCard
            card={avatar}
            sourcePosition={id}
            isSelected={selectedCardId === avatar.id}
            isHovered={hoveredCardId === avatar.id}
            onClick={() => onCardClick?.(avatar)}
            onHover={onCardHover}
          />
        </div>
      )}

      {/* Cards under site - shown at lower-left */}
      {site.underCards.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '-35px',
            left: '-10px',
            zIndex: 0,
            display: 'flex',
          }}
        >
          {site.underCards.map((card, index) => (
            <div
              key={card.id}
              style={{
                marginLeft: index > 0 ? '-50px' : 0,
                transform: 'scale(0.6)',
                transformOrigin: 'bottom left',
              }}
            >
              <DraggableBoardCard
                card={card}
                sourcePosition={id}
                isSelected={selectedCardId === card.id}
                isHovered={hoveredCardId === card.id}
                onClick={() => onCardClick?.(card)}
                onHover={onCardHover}
              />
            </div>
          ))}
        </div>
      )}

      {/* Drop indicator */}
      {isOver && (
        <div className="absolute inset-0 border-2 border-dashed border-green-400 rounded-lg pointer-events-none" style={{ zIndex: 10 }} />
      )}
    </div>
  );
}
