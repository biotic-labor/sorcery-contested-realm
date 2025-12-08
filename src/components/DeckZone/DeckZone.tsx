import { useDroppable } from '@dnd-kit/core';
import { useGameStore } from '../../hooks/useGameState';
import { Player, DeckType, CardInstance } from '../../types';

interface DeckZoneProps {
  player: Player;
  deckType: DeckType;
  cards: CardInstance[];
}

export function DeckZone({ player, deckType, cards }: DeckZoneProps) {
  const { shuffleDeck, setHoveredDeck } = useGameStore();
  const dropId = `deck-${player}-${deckType}`;

  const { isOver, setNodeRef } = useDroppable({
    id: dropId,
  });

  const label = deckType === 'site' ? 'Sites' : 'Spells';
  const bgColor = deckType === 'site' ? '#4b5563' : '#374151';
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
        backgroundColor: bgColor,
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
      {/* Card count */}
      <div
        style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#fff',
        }}
      >
        {cards.length}
      </div>

      {/* Label */}
      <div
        style={{
          fontSize: '10px',
          color: '#9ca3af',
          textTransform: 'uppercase',
          marginTop: '4px',
        }}
      >
        {label}
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
