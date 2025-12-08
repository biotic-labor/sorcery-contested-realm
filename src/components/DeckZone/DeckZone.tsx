import { useDroppable } from '@dnd-kit/core';
import { useGameStore } from '../../hooks/useGameState';
import { Player, DeckType, CardInstance } from '../../types';

interface DeckZoneProps {
  player: Player;
  deckType: DeckType;
  cards: CardInstance[];
}

const CARD_BACK_URLS = {
  site: 'https://d27a44hjr9gen3.cloudfront.net/assets/tts/cardbacks/cardback-atlas.png',
  spell: 'https://d27a44hjr9gen3.cloudfront.net/assets/tts/cardbacks/cardback-spellbook.png',
};

export function DeckZone({ player, deckType, cards }: DeckZoneProps) {
  const { shuffleDeck, setHoveredDeck, shufflingDeck } = useGameStore();
  const isShuffling = shufflingDeck?.player === player && shufflingDeck?.deckType === deckType;
  const dropId = `deck-${player}-${deckType}`;

  const { isOver, setNodeRef } = useDroppable({
    id: dropId,
  });

  const cardBackUrl = CARD_BACK_URLS[deckType];
  const borderColor = isOver ? '#22c55e' : '#6b7280';

  return (
    <div
      ref={setNodeRef}
      onMouseEnter={() => setHoveredDeck({ player, deckType })}
      onMouseLeave={() => setHoveredDeck(null)}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        width: '80px',
        height: '110px',
        backgroundImage: `url(${cardBackUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: `2px solid ${borderColor}`,
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease',
      }}
    >
      {/* Spinning cards during shuffle */}
      {isShuffling && (
        <>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '50px',
                height: '70px',
                backgroundImage: `url(${cardBackUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '2px solid #6b7280',
                borderRadius: '4px',
                animation: 'shuffleSpin 0.6s ease-in-out',
                animationDelay: `${i * 0.1}s`,
                transformOrigin: 'center center',
                zIndex: i,
              }}
            />
          ))}
        </>
      )}

      {/* Card count */}
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#fff',
          zIndex: 10,
        }}
      >
        {cards.length}
      </div>

      {/* Shuffle button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          shuffleDeck(player, deckType);
        }}
        style={{
          position: 'absolute',
          bottom: '4px',
          right: '4px',
          width: '20px',
          height: '20px',
          borderRadius: '4px',
          backgroundColor: '#1f2937',
          border: '1px solid #4b5563',
          color: '#9ca3af',
          fontSize: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Shuffle deck"
        className="hover:bg-gray-600"
      >
        S
      </button>

      {/* Drop indicator */}
      {isOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            borderRadius: '4px',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Hotkey hint */}
      <div
        style={{
          position: 'absolute',
          top: '4px',
          left: '4px',
          fontSize: '8px',
          color: '#6b7280',
        }}
      >
        1-9
      </div>
    </div>
  );
}
