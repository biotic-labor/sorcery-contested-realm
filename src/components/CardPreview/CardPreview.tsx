import { CardInstance, getCardImageUrl } from '../../types';
import { useState, useEffect } from 'react';

interface CardPreviewProps {
  card: CardInstance | null;
}

const typeColors: Record<string, string> = {
  Site: '#3b82f6',
  Minion: '#ef4444',
  Magic: '#8b5cf6',
  Aura: '#10b981',
  Artifact: '#f59e0b',
  Avatar: '#ec4899',
};

export function CardPreview({ card }: CardPreviewProps) {
  const [imageError, setImageError] = useState(false);

  // Reset image error when card changes
  useEffect(() => {
    setImageError(false);
  }, [card?.id]);

  if (!card) {
    return (
      <div
        style={{
          width: '280px',
          height: '280px',
          backgroundColor: '#1f2937',
          borderRadius: '12px',
          border: '1px solid #374151',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '200px',
            height: '280px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280',
            fontSize: '14px',
            textAlign: 'center',
            padding: '16px',
          }}
        >
          Hover over a card to preview
        </div>
      </div>
    );
  }

  const { cardData, variant } = card;
  const { guardian } = cardData;
  const bgColor = typeColors[guardian.type] || '#6b7280';
  const isSite = guardian.type === 'Site';

  // Container is always 280x280, card is centered inside
  const containerSize = 280;
  const cardWidth = isSite ? 280 : 200;
  const cardHeight = isSite ? 200 : 280;

  return (
    <div
      style={{
        width: `${containerSize}px`,
        height: `${containerSize}px`,
        backgroundColor: '#1f2937',
        borderRadius: '12px',
        border: '1px solid #374151',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: `${cardWidth}px`,
          height: `${cardHeight}px`,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '8px',
        }}
      >
        {!imageError ? (
          <img
            src={getCardImageUrl(variant.slug)}
            alt={cardData.name}
            style={{
              width: isSite ? cardHeight : '100%',
              height: isSite ? cardWidth : '100%',
              objectFit: 'cover',
              transform: isSite ? 'rotate(90deg)' : undefined,
              transformOrigin: 'center center',
              position: isSite ? 'absolute' : undefined,
              top: isSite ? '50%' : undefined,
              left: isSite ? '50%' : undefined,
              marginTop: isSite ? -(cardWidth / 2) : undefined,
              marginLeft: isSite ? -(cardHeight / 2) : undefined,
            }}
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold',
              textAlign: 'center',
              padding: '16px',
            }}
          >
            {cardData.name}
          </div>
        )}
      </div>
    </div>
  );
}
