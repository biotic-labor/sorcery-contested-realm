import { DeckType } from '../../types';

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

// Card back images (local assets)
const CARD_BACK_URLS = {
  site: '/assets/card-backs/cardback-atlas.png',
  spell: '/assets/card-backs/cardback-spellbook.png',
  default: '/assets/card-backs/cardback-spellbook.png', // Default to spell back
};

export function CardBack({ size = 'medium', deckType }: CardBackProps) {
  const cardSize = sizes[size];
  const backUrl = deckType ? CARD_BACK_URLS[deckType] : CARD_BACK_URLS.default;

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
