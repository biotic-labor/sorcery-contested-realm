import { useState } from 'react';
import { CardInstance, getCardImageUrl, getCardBackUrl } from '../../types';

interface CardProps {
  card: CardInstance;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isHovered?: boolean;
  size?: 'xsmall' | 'small' | 'medium' | 'large';
  showAsHorizontal?: boolean;
  onCounterIncrement?: () => void;
  onCounterDecrement?: () => void;
}

const sizes = {
  xsmall: { width: 60, height: 90 },
  small: { width: 85, height: 128 },
  medium: { width: 120, height: 180 },
  large: { width: 160, height: 240 },
};

const horizontalSizes = {
  xsmall: { width: 90, height: 60 },
  small: { width: 152, height: 101 },
  medium: { width: 180, height: 120 },
  large: { width: 240, height: 160 },
};

const typeColors: Record<string, string> = {
  Site: '#3b82f6',
  Minion: '#ef4444',
  Magic: '#8b5cf6',
  Aura: '#10b981',
  Artifact: '#f59e0b',
  Avatar: '#ec4899',
};

export function Card({
  card,
  onClick,
  onMouseEnter,
  onMouseLeave,
  isHovered = false,
  size = 'medium',
  showAsHorizontal = false,
  onCounterIncrement,
  onCounterDecrement,
}: CardProps) {
  const [imageError, setImageError] = useState(false);
  const cardType = card.cardData.guardian.type;
  const isSite = cardType === 'Site';
  const isTapped = card.rotation === 90;
  const isFaceDown = card.faceDown === true;

  // Sites are rotated 90 degrees to display horizontally
  // Use horizontal container for sites, portrait for others
  const displayHorizontal = showAsHorizontal || isSite;
  const baseSize = displayHorizontal ? horizontalSizes[size] : sizes[size];
  // When tapped, swap width/height so the hitbox matches the rotated visual
  const cardSize = isTapped
    ? { width: baseSize.height, height: baseSize.width }
    : baseSize;
  const bgColor = typeColors[cardType] || '#6b7280';

  // Sites need their image rotated 90 degrees within the horizontal container
  const imageRotation = isSite ? 'rotate(90deg)' : undefined;
  // The inner content size is always the base (non-tapped) size
  const contentSize = baseSize;

  // Determine the card back type based on card type
  const cardBackType: 'site' | 'spell' = isSite ? 'site' : 'spell';

  return (
    <div
      className={`
        relative cursor-pointer transition-all duration-200
        ${isHovered ? 'scale-105 z-10' : ''}
        ${isTapped ? 'opacity-60' : ''}
      `}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        width: cardSize.width,
        height: cardSize.height,
        transform: isTapped ? 'rotate(90deg)' : undefined,
        perspective: '1000px',
      }}
    >
      {/* Card flip container - uses original size, centered in rotated container */}
      <div
        style={{
          width: contentSize.width,
          height: contentSize.height,
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) ${isFaceDown ? 'rotateY(180deg)' : 'rotateY(0deg)'}`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.4s ease-in-out',
        }}
      >
        {/* Front face (card image) */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            overflow: 'hidden',
          }}
        >
          {!imageError ? (
            <img
              src={getCardImageUrl(card.variant.slug)}
              alt={card.cardData.name}
              className="rounded-lg shadow-lg"
              style={{
                width: isSite ? contentSize.height : '100%',
                height: isSite ? contentSize.width : '100%',
                objectFit: 'cover',
                transform: imageRotation,
                transformOrigin: 'center center',
                position: isSite ? 'absolute' : undefined,
                top: isSite ? '50%' : undefined,
                left: isSite ? '50%' : undefined,
                marginTop: isSite ? -(contentSize.width / 2) : undefined,
                marginLeft: isSite ? -(contentSize.height / 2) : undefined,
              }}
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className="w-full h-full rounded-lg shadow-lg flex flex-col items-center justify-center p-2 text-white text-center"
              style={{ backgroundColor: bgColor }}
            >
              <div className="text-xs font-bold truncate w-full">{card.cardData.name}</div>
              <div className="text-xs opacity-75">{cardType}</div>
              {card.cardData.guardian.cost !== null && (
                <div className="text-lg font-bold mt-1">{card.cardData.guardian.cost}</div>
              )}
              {card.cardData.guardian.attack !== null && (
                <div className="text-xs mt-1">
                  {card.cardData.guardian.attack}/{card.cardData.guardian.defence}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Back face (card back) */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            overflow: 'hidden',
          }}
        >
          <img
            src={getCardBackUrl(cardBackType)}
            alt="Card back"
            className="rounded-lg shadow-lg"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      </div>

      {isHovered && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20">
          {card.cardData.name}
        </div>
      )}

      {/* Counter badge - centered, styled like mana/health controls */}
      {card.counters !== undefined && card.counters > 0 && (
        <div
          className="absolute select-none"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            minWidth: size === 'xsmall' ? '24px' : size === 'small' ? '28px' : '36px',
            height: size === 'xsmall' ? '32px' : size === 'small' ? '40px' : '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #4b5563',
            borderRadius: '4px',
            backgroundColor: '#374151',
            zIndex: 30,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {(onCounterIncrement || onCounterDecrement) && (
            <>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onCounterIncrement?.();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '50%',
                  cursor: 'pointer',
                  borderBottom: '1px solid #4b5563',
                }}
                className="hover:bg-white/10 active:bg-white/20"
              />
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onCounterDecrement?.();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '50%',
                  cursor: 'pointer',
                }}
                className="hover:bg-white/10 active:bg-white/20"
              />
            </>
          )}
          <span
            style={{
              fontSize: size === 'xsmall' ? '14px' : size === 'small' ? '18px' : '24px',
              fontWeight: 'bold',
              color: '#f87171',
              pointerEvents: 'none',
            }}
          >
            {card.counters}
          </span>
        </div>
      )}
    </div>
  );
}
