import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CardInstance, getCardImageUrl } from '../../types';
import { useGameStore } from '../../hooks/useGameState';

interface RevealHandModalProps {
  isOpen: boolean;
  cards: CardInstance[];
  nickname: string;
  onClose: () => void;
}

export function RevealHandModal({ isOpen, cards, nickname, onClose }: RevealHandModalProps) {
  const { hoverCard } = useGameStore();

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            {nickname}&apos;s Hand ({cards.length} cards)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {cards.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Hand is empty</p>
        ) : (
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            }}
          >
            {cards.map((card) => (
              <div
                key={card.id}
                onMouseEnter={() => hoverCard(card)}
                onMouseLeave={() => hoverCard(null)}
                className="cursor-pointer"
              >
                <img
                  src={getCardImageUrl(card.variant.slug)}
                  alt={card.cardData.name}
                  style={{
                    width: '100px',
                    height: '140px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    border: '2px solid #374151',
                  }}
                  draggable={false}
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
