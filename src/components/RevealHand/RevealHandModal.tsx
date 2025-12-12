import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CardInstance, getCardImageUrl } from '../../types';

interface RevealHandModalProps {
  isOpen: boolean;
  cards: CardInstance[];
  nickname: string;
  onClose: () => void;
}

export function RevealHandModal({ isOpen, cards, nickname, onClose }: RevealHandModalProps) {
  const [hoveredCard, setHoveredCard] = useState<CardInstance | null>(null);

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

  // Clear hovered card when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHoveredCard(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg p-6 flex gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card preview panel */}
        <div
          style={{
            width: '200px',
            height: '280px',
            backgroundColor: '#1f2937',
            borderRadius: '8px',
            border: '1px solid #374151',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {hoveredCard ? (
            <img
              src={getCardImageUrl(hoveredCard.variant.slug)}
              alt={hoveredCard.cardData.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '6px',
              }}
            />
          ) : (
            <span className="text-gray-500 text-sm text-center px-4">
              Hover a card to preview
            </span>
          )}
        </div>

        {/* Cards list */}
        <div className="max-w-2xl max-h-[70vh] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">
              {nickname}&apos;s Hand ({cards.length} cards)
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none ml-4"
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
                  onMouseEnter={() => setHoveredCard(card)}
                  onMouseLeave={() => setHoveredCard(null)}
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
                      border: hoveredCard?.id === card.id ? '2px solid #3b82f6' : '2px solid #374151',
                      transition: 'border-color 0.15s ease',
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
      </div>
    </div>,
    document.body
  );
}
