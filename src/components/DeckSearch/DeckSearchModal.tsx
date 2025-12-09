import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CardInstance, DeckType, getCardImageUrl } from '../../types';
import { useGameStore } from '../../hooks/useGameState';

interface DeckSearchModalProps {
  isOpen: boolean;
  cards: CardInstance[];
  deckType: DeckType;
  onClose: () => void;
  onReturnCards: (cards: CardInstance[], position: 'top' | 'bottom') => void;
  onSendCardToDeck: (card: CardInstance, position: 'top' | 'bottom') => void;
  onAddToHand: (card: CardInstance) => void;
  onPlayToBoard: (card: CardInstance) => void;
}

interface SortableSearchCardProps {
  card: CardInstance;
  onContextMenu: (e: React.MouseEvent, card: CardInstance) => void;
}

function SortableSearchCard({ card, onContextMenu }: SortableSearchCardProps) {
  const { hoverCard } = useGameStore();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onContextMenu={(e) => onContextMenu(e, card)}
      onMouseEnter={() => hoverCard(card)}
      onMouseLeave={() => hoverCard(null)}
      className={`
        cursor-grab
        ${isDragging ? 'opacity-50 cursor-grabbing' : ''}
      `}
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
  );
}

interface CardContextMenuProps {
  x: number;
  y: number;
  onSendToTop: () => void;
  onSendToBottom: () => void;
  onAddToHand: () => void;
  onPlayToBoard: () => void;
  onClose: () => void;
}

function CardContextMenu({ x, y, onSendToTop, onSendToBottom, onAddToHand, onPlayToBoard, onClose }: CardContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 2000,
        backgroundColor: '#1f2937',
        border: '1px solid #374151',
        borderRadius: '6px',
        padding: '4px 0',
        minWidth: '140px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      <button
        onClick={onSendToTop}
        style={{
          display: 'block',
          width: '100%',
          padding: '8px 12px',
          textAlign: 'left',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#e5e7eb',
          cursor: 'pointer',
          fontSize: '14px',
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#374151')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        Send to top
      </button>
      <button
        onClick={onSendToBottom}
        style={{
          display: 'block',
          width: '100%',
          padding: '8px 12px',
          textAlign: 'left',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#e5e7eb',
          cursor: 'pointer',
          fontSize: '14px',
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#374151')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        Send to bottom
      </button>
      <div style={{ borderTop: '1px solid #374151', margin: '4px 0' }} />
      <button
        onClick={onAddToHand}
        style={{
          display: 'block',
          width: '100%',
          padding: '8px 12px',
          textAlign: 'left',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#e5e7eb',
          cursor: 'pointer',
          fontSize: '14px',
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#374151')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        Add to hand
      </button>
      <button
        onClick={onPlayToBoard}
        style={{
          display: 'block',
          width: '100%',
          padding: '8px 12px',
          textAlign: 'left',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#e5e7eb',
          cursor: 'pointer',
          fontSize: '14px',
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#374151')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        Play to board
      </button>
    </div>
  );
}

export function DeckSearchModal({
  isOpen,
  cards: initialCards,
  deckType,
  onClose,
  onReturnCards,
  onSendCardToDeck,
  onAddToHand,
  onPlayToBoard,
}: DeckSearchModalProps) {
  const [cards, setCards] = useState<CardInstance[]>(initialCards);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; card: CardInstance } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Reset cards when modal opens with new cards
  useEffect(() => {
    setCards(initialCards);
  }, [initialCards]);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (contextMenu) {
          setContextMenu(null);
        } else {
          // Return all cards to top when escaping
          onReturnCards(cards, 'top');
          onClose();
        }
      }
    },
    [onClose, onReturnCards, cards, contextMenu]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCards((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleCardContextMenu = (e: React.MouseEvent, card: CardInstance) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, card });
  };

  const handleSendToTop = () => {
    if (contextMenu) {
      const card = contextMenu.card;
      setCards((prev) => prev.filter((c) => c.id !== card.id));
      onSendCardToDeck(card, 'top');
      setContextMenu(null);
    }
  };

  const handleSendToBottom = () => {
    if (contextMenu) {
      const card = contextMenu.card;
      setCards((prev) => prev.filter((c) => c.id !== card.id));
      onSendCardToDeck(card, 'bottom');
      setContextMenu(null);
    }
  };

  const handleAddToHand = () => {
    if (contextMenu) {
      const card = contextMenu.card;
      setCards((prev) => prev.filter((c) => c.id !== card.id));
      onAddToHand(card);
      setContextMenu(null);
    }
  };

  const handlePlayToBoard = () => {
    if (contextMenu) {
      const card = contextMenu.card;
      setCards((prev) => prev.filter((c) => c.id !== card.id));
      onPlayToBoard(card);
      setContextMenu(null);
    }
  };

  const handlePutAllOnTop = () => {
    onReturnCards(cards, 'top');
    onClose();
  };

  const handlePutAllOnBottom = () => {
    onReturnCards(cards, 'bottom');
    onClose();
  };

  if (!isOpen) return null;

  const deckLabel = deckType === 'site' ? 'Site Deck' : 'Spell Deck';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          onReturnCards(cards, 'top');
          onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div className="relative z-10 w-full max-w-3xl mx-4 bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            Searching {deckLabel} ({cards.length} cards)
          </h2>
          <button
            onClick={() => {
              onReturnCards(cards, 'top');
              onClose();
            }}
            className="p-1 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-gray-700"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {cards.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              All cards have been placed on the deck
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={cards.map(c => c.id)} strategy={rectSortingStrategy}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 100px)',
                    gap: '12px',
                    justifyContent: 'center',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    padding: '8px',
                  }}
                >
                  {cards.map((card) => (
                    <SortableSearchCard
                      key={card.id}
                      card={card}
                      onContextMenu={handleCardContextMenu}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <div className="text-xs text-gray-500 text-center mt-2">
            Drag to reorder. Right-click card to send to top/bottom.
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-center gap-4 px-4 py-3 border-t border-gray-700">
          <button
            onClick={handlePutAllOnTop}
            disabled={cards.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors"
          >
            Put on Top
          </button>
          <button
            onClick={handlePutAllOnBottom}
            disabled={cards.length === 0}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-md transition-colors"
          >
            Put on Bottom
          </button>
        </div>
      </div>

      {/* Card context menu */}
      {contextMenu && (
        <CardContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onSendToTop={handleSendToTop}
          onSendToBottom={handleSendToBottom}
          onAddToHand={handleAddToHand}
          onPlayToBoard={handlePlayToBoard}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>,
    document.body
  );
}
