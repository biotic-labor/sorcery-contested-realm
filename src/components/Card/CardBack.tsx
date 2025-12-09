import { DeckType, getCardBackUrl } from '../../types';

interface CardBackProps {
  size?: 'xsmall' | 'small' | 'medium' | 'large';
  deckType?: DeckType;
}

const sizes = {
  xsmall: { width: 60, height: 90 },
  small: { width: 85, height: 128 },
  medium: { width: 120, height: 180 },
  large: { width: 160, height: 240 },
};

export function CardBack({ size = 'medium', deckType }: CardBackProps) {
  const cardSize = sizes[size];
  const backUrl = getCardBackUrl(deckType ?? 'spell');

  return (
    <div
      className="rounded-lg shadow-lg overflow-hidden flex-shrink-0"
      style={{
        width: cardSize.width,
        height: cardSize.height,
      }}
    >
      <img
        src={backUrl}
        alt="Card back"
        className="w-full h-full object-cover"
        onError={(e) => {
          // Fallback to a gradient if image fails
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.parentElement!.style.background = 'linear-gradient(135deg, #1a365d 0%, #2d3748 50%, #1a202c 100%)';
        }}
      />
    </div>
  );
}
