import { useState } from 'react';
import { CardInstance, getCardImageUrl } from '../../types';

interface CardProps {
  card: CardInstance;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isSelected?: boolean;
  isHovered?: boolean;
  size?: 'xsmall' | 'small' | 'medium' | 'large';
  showAsHorizontal?: boolean;
}

const sizes = {
  xsmall: { width: 60, height: 90 },
  small: { width: 85, height: 128 },
  medium: { width: 120, height: 180 },
  large: { width: 160, height: 240 },
};

const horizontalSizes = {
  xsmall: { width: 90, height: 60 },
  small: { width: 128, height: 85 },
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
  isSelected = false,
  isHovered = false,
  size = 'medium',
  showAsHorizontal = false,
}: CardProps) {
  const [imageError, setImageError] = useState(false);
  const cardType = card.cardData.guardian.type;
  const isSite = cardType === 'Site';
  const isTapped = card.rotation === 90;

  // Sites are rotated 90 degrees to display horizontally
  // Use horizontal container for sites, portrait for others
  const displayHorizontal = showAsHorizontal || isSite;
  const cardSize = displayHorizontal ? horizontalSizes[size] : sizes[size];
  const bgColor = typeColors[cardType] || '#6b7280';

  // Sites need their image rotated 90 degrees within the horizontal container
  const imageRotation = isSite ? 'rotate(90deg)' : undefined;

  return (
    <div
      className={`
        relative cursor-pointer transition-all duration-200
        ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-gray-900' : ''}
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
        overflow: 'hidden',
      }}
    >
      {!imageError ? (
        <img
          src={getCardImageUrl(card.variant.slug)}
          alt={card.cardData.name}
          className="rounded-lg shadow-lg"
          style={{
            width: isSite ? cardSize.height : '100%',
            height: isSite ? cardSize.width : '100%',
            objectFit: 'cover',
            transform: imageRotation,
            transformOrigin: 'center center',
            position: isSite ? 'absolute' : undefined,
            top: isSite ? '50%' : undefined,
            left: isSite ? '50%' : undefined,
            marginTop: isSite ? -(cardSize.width / 2) : undefined,
            marginLeft: isSite ? -(cardSize.height / 2) : undefined,
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

      {isTapped && (
        <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg flex items-center justify-center">
          <span className="text-white text-xs font-bold bg-black bg-opacity-50 px-2 py-1 rounded">
            TAPPED
          </span>
        </div>
      )}

      {isHovered && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20">
          {card.cardData.name}
        </div>
      )}
    </div>
  );
}
