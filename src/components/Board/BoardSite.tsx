import { useDroppable } from '@dnd-kit/core';
import { BoardSite as BoardSiteType, positionKey, CardInstance } from '../../types';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';
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
  labelCounterRotate?: boolean; // Counter-rotate grid label when board is rotated for player 2
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
  labelCounterRotate = false,
}: BoardSiteProps) {
  const id = positionKey(row, col);
  const { isOver, setNodeRef } = useDroppable({ id });

  // Get multiplayer state to determine card ownership
  const { localPlayer, connectionStatus } = useMultiplayerStore();
  const isMultiplayer = connectionStatus === 'connected';

  // When board is rotated (guest), flip the card rotation logic
  const isBoardRotated = isMultiplayer && localPlayer === 'opponent';
  const isOpponentCard = (card: CardInstance) =>
    isMultiplayer && (isBoardRotated ? card.owner === localPlayer : card.owner !== localPlayer);

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
      {/* Grid position label (1-20 for dice rolls) - counter-rotate so it's readable */}
      <div
        className="absolute top-1 left-1 text-xs text-white font-mono"
        style={{
          zIndex: 0,
          transform: labelCounterRotate ? 'rotate(180deg)' : undefined,
          top: labelCounterRotate ? 'auto' : undefined,
          bottom: labelCounterRotate ? '4px' : undefined,
          left: labelCounterRotate ? 'auto' : undefined,
          right: labelCounterRotate ? '4px' : undefined,
        }}
      >
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
            isOpponentCard={isOpponentCard(site.siteCard)}
          />
        </div>
      )}

      {/* Units stacked on site */}
      {site.units.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2, pointerEvents: 'none' }}>
          <div className="relative">
            {site.units.map((unit, index) => {
              // Own cards: bottom-right visually. Opponent cards: top-left visually.
              const isMyCard = unit.owner === localPlayer;
              // For rotated board (Player 2), local coords are flipped by parent's 180deg rotation
              // So we need to negate our offsets to achieve the desired visual result
              const rotationFix = isBoardRotated ? -1 : 1;
              const multiplier = (isMyCard ? 1 : -1) * rotationFix;
              const baseY = 35;
              const baseX = 25;
              return (
              <div
                key={unit.id}
                className="absolute"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) translateY(${(baseY + index * 25) * multiplier}px) translateX(${(baseX + index * 15) * multiplier}px)`,
                  zIndex: index + 1,
                  pointerEvents: 'auto',
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
            );
            })}
          </div>
        </div>
      )}

      {/* Avatar on site */}
      {avatar && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 3, pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto' }}>
            <DraggableBoardCard
              card={avatar}
              sourcePosition={id}
              isSelected={selectedCardId === avatar.id}
              isHovered={hoveredCardId === avatar.id}
              onClick={() => onCardClick?.(avatar)}
              onHover={onCardHover}
              isOpponentCard={isOpponentCard(avatar)}
            />
          </div>
        </div>
      )}

      {/* Cards under site - tucked behind the site card */}
      {site.underCards.length > 0 && (
        <div
          style={{
            position: 'absolute',
            ...(isBoardRotated
              ? { top: '0px', right: '-15px' }
              : { bottom: '0px', left: '-15px' }),
            zIndex: 0,
            display: 'flex',
          }}
        >
          {site.underCards.map((card, index) => {
            const isHovered = hoveredCardId === card.id;
            return (
              <div
                key={card.id}
                style={{
                  marginLeft: index > 0 ? (isBoardRotated ? '0' : '-40px') : 0,
                  marginRight: index > 0 ? (isBoardRotated ? '-40px' : '0') : 0,
                  transform: `translateY(${(30 + index * 15) * (isBoardRotated ? -1 : 1)}px) ${isHovered ? 'scale(0.75)' : 'scale(0.65)'}`,
                  transformOrigin: isBoardRotated ? 'center top' : 'center bottom',
                  zIndex: isHovered ? 20 : index + 1,
                  transition: 'transform 0.15s ease, z-index 0s',
                }}
              >
                <DraggableBoardCard
                  card={card}
                  sourcePosition={id}
                  isSelected={selectedCardId === card.id}
                  isHovered={isHovered}
                  onClick={() => onCardClick?.(card)}
                  onHover={onCardHover}
                  isOpponentCard={isOpponentCard(card)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Drop indicator */}
      {isOver && (
        <div className="absolute inset-0 border-2 border-dashed border-green-400 rounded-lg pointer-events-none" style={{ zIndex: 10 }} />
      )}
    </div>
  );
}
