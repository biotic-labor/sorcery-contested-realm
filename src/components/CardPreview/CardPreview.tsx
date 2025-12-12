import { CardInstance, getCardImageUrl, getCardBackUrl } from '../../types';
import { useState, useEffect } from 'react';

interface CardPreviewProps {
  card: CardInstance | null;
  hideIfFaceDown?: boolean; // If true, show card back for face-down cards
}

const typeColors: Record<string, string> = {
  Site: '#3b82f6',
  Minion: '#ef4444',
  Magic: '#8b5cf6',
  Aura: '#10b981',
  Artifact: '#f59e0b',
  Avatar: '#ec4899',
};

export function CardPreview({ card, hideIfFaceDown = false }: CardPreviewProps) {
  const [imageError, setImageError] = useState(false);

  // Reset image error when card changes
  useEffect(() => {
    setImageError(false);
  }, [card?.id]);

  if (!card) {
    return (
      <div
        style={{
          width: 'var(--preview-size)',
          height: 'var(--preview-size)',
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
            width: 'var(--preview-card-width)',
            height: 'var(--preview-card-height)',
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
  const isFaceDown = hideIfFaceDown && card.faceDown;

  // For sites, swap width/height (landscape orientation)
  const cardWidth = isSite ? 'var(--preview-card-height)' : 'var(--preview-card-width)';
  const cardHeight = isSite ? 'var(--preview-card-width)' : 'var(--preview-card-height)';

  return (
    <div
      style={{
        width: 'var(--preview-size)',
        height: 'var(--preview-size)',
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
          width: cardWidth,
          height: cardHeight,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '8px',
        }}
      >
        {isFaceDown ? (
          <img
            src={getCardBackUrl(isSite ? 'site' : 'spell')}
            alt="Card back"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : !imageError ? (
          <img
            src={getCardImageUrl(variant.slug)}
            alt={cardData.name}
            style={isSite ? {
              // Site images are stored portrait, rotate to landscape
              // Position absolute + translate centers, then rotate 90deg
              position: 'absolute',
              width: cardHeight,
              height: cardWidth,
              objectFit: 'cover',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(90deg)',
            } : {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
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
