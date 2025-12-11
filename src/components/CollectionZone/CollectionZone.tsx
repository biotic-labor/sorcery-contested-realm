import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Player, CardInstance } from '../../types';
import { CollectionSearchModal } from './CollectionSearchModal';

interface CollectionZoneProps {
  player: Player;
  cards: CardInstance[];
}

export function CollectionZone({ player, cards }: CollectionZoneProps) {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const dropId = `collection-${player}`;

  const { isOver, setNodeRef } = useDroppable({
    id: dropId,
  });

  const borderColor = isOver ? '#22c55e' : '#6b7280';

  const handleClick = () => {
    if (cards.length > 0) {
      setIsSearchModalOpen(true);
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        onClick={handleClick}
        style={{
          width: '60px',
          height: '40px',
          border: `2px solid ${borderColor}`,
          borderRadius: '6px',
          backgroundColor: '#1f2937',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: cards.length > 0 ? 'pointer' : 'default',
          transition: 'border-color 0.2s, background-color 0.2s',
          position: 'relative',
        }}
        title={cards.length > 0 ? 'Click to search collection' : 'Collection (empty)'}
      >
        <span
          style={{
            fontSize: '10px',
            color: '#9ca3af',
            marginBottom: '2px',
          }}
        >
          Collection
        </span>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: cards.length > 0 ? '#ffffff' : '#6b7280',
          }}
        >
          {cards.length}
        </span>
      </div>

      <CollectionSearchModal
        isOpen={isSearchModalOpen}
        cards={cards}
        player={player}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </>
  );
}
