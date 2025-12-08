import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { useState, useEffect, useRef } from 'react';
import { Board } from './components/Board';
import { Hand } from './components/Hand';
import { GameControls } from './components/GameControls';
import { CardPreview } from './components/CardPreview';
import { PlayerStats } from './components/PlayerStats';
import { DeckZone } from './components/DeckZone';
import { DiscardPile } from './components/DiscardPile';
import { DeckImportButton } from './components/DeckImport';
import { Card } from './components/Card';
import { useGameStore } from './hooks/useGameState';
import { useHotkeys } from './hooks/useHotkeys';
import { CardInstance, parsePositionKey, Player, DeckType } from './types';
import { createMockCards, createMockAvatar } from './utils/mockData';

function App() {
  const [activeCard, setActiveCard] = useState<CardInstance | null>(null);
  const initialized = useRef(false);
  const {
    placeCardOnSite,
    placeUnitOnSite,
    moveCard,
    removeFromHand,
    reorderHand,
    addToHand,
    hoveredCard,
    // Deck state
    playerSiteDeck,
    playerSpellDeck,
    opponentSiteDeck,
    opponentSpellDeck,
    // Graveyard state
    playerGraveyard,
    opponentGraveyard,
    // Deck/graveyard actions
    putCardOnTop,
    putCardOnBottom,
    addToGraveyard,
    removeCardFromBoard,
    // Avatar
    placeAvatar,
    moveAvatar,
    // Vertex actions
    placeUnitOnVertex,
    removeCardFromVertex,
  } = useGameStore();

  // Initialize hotkeys
  useHotkeys();

  // Load mock data on mount (once only)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const mockCards = createMockCards();
    mockCards.forEach((card) => addToHand(card, 'player'));

    const avatar = createMockAvatar('player');
    placeAvatar(avatar, { row: 3, col: 2 });
  }, [addToHand, placeAvatar]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = active.data.current?.card as CardInstance | undefined;
    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const card = active.data.current?.card as CardInstance | undefined;
    const source = active.data.current?.source as string | undefined;
    const sourcePosition = active.data.current?.sourcePosition as string | undefined;
    const activeIndex = active.data.current?.index as number | undefined;
    const activePlayer = active.data.current?.player as Player | undefined;

    if (!card) return;

    // Check if dropping on another card in hand (reordering)
    const overData = over.data.current;
    if (source === 'hand' && overData?.source === 'hand' && activePlayer && activePlayer === overData?.player) {
      const overIndex = overData.index as number;
      if (activeIndex !== undefined && overIndex !== undefined && activeIndex !== overIndex) {
        reorderHand(activePlayer, activeIndex, overIndex);
      }
      return;
    }

    const overId = over.id as string;

    // Check if dropping on a deck (put card back)
    if (overId.startsWith('deck-')) {
      const parts = overId.split('-');
      const deckPlayer = parts[1] as Player;
      const deckType = parts[2] as DeckType;

      // Check for right-click (button === 2) to put on bottom
      const isRightClick = event.activatorEvent instanceof PointerEvent && event.activatorEvent.button === 2;

      if (isRightClick) {
        putCardOnBottom(card, deckPlayer, deckType);
      } else {
        putCardOnTop(card, deckPlayer, deckType);
      }

      // Remove card from source
      if (source === 'hand') {
        removeFromHand(card.id, card.owner);
      } else if (source === 'board' && sourcePosition) {
        if (sourcePosition.startsWith('v-')) {
          // From vertex
          removeCardFromVertex(card.id, sourcePosition);
        } else {
          // From board position
          const fromPosition = parsePositionKey(sourcePosition);
          removeCardFromBoard(card.id, fromPosition);
        }
      }
      return;
    }

    // Check if dropping on a discard pile
    if (overId.startsWith('discard-')) {
      const discardPlayer = overId.split('-')[1] as Player;

      addToGraveyard(card, discardPlayer);

      // Remove card from source
      if (source === 'hand') {
        removeFromHand(card.id, card.owner);
      } else if (source === 'board' && sourcePosition) {
        if (sourcePosition.startsWith('v-')) {
          // From vertex
          removeCardFromVertex(card.id, sourcePosition);
        } else {
          // From board position
          const fromPosition = parsePositionKey(sourcePosition);
          removeCardFromBoard(card.id, fromPosition);
        }
      }
      return;
    }

    // Check if dropping on a hand
    if (overId.startsWith('hand-')) {
      const handPlayer = overId.split('-')[1] as Player;

      addToHand(card, handPlayer);

      // Remove card from source
      if (source === 'board' && sourcePosition) {
        if (sourcePosition.startsWith('v-')) {
          removeCardFromVertex(card.id, sourcePosition);
        } else {
          const fromPosition = parsePositionKey(sourcePosition);
          removeCardFromBoard(card.id, fromPosition);
        }
      }
      return;
    }

    // Check if dropping on a vertex
    if (overId.startsWith('v-')) {
      // Only allow units (reject Sites and Avatars)
      const cardType = card.cardData.guardian.type;
      if (cardType === 'Site' || cardType === 'Avatar') {
        return; // Reject the drop
      }

      const vertexId = overId as string;

      // Place unit on vertex
      placeUnitOnVertex(card, vertexId);

      // Remove card from source
      if (source === 'hand') {
        removeFromHand(card.id, card.owner);
      } else if (source === 'board' && sourcePosition) {
        if (sourcePosition.startsWith('v-')) {
          // Moving from vertex to vertex
          removeCardFromVertex(card.id, sourcePosition);
        } else {
          // Moving from board to vertex
          const fromPosition = parsePositionKey(sourcePosition);
          removeCardFromBoard(card.id, fromPosition);
        }
      }
      return;
    }

    // Check if dropping on a board position
    if (!overId.includes('-')) return; // Not a board position

    // Parse the drop target (board position)
    const targetPosition = parsePositionKey(overId);

    // Don't do anything if dropping on the same position
    if (source === 'board' && sourcePosition === over.id) {
      return;
    }

    if (source === 'board' && sourcePosition) {
      // Moving from board/vertex to board
      if (sourcePosition.startsWith('v-')) {
        // Moving from vertex to board
        placeUnitOnSite(card, targetPosition);
        removeCardFromVertex(card.id, sourcePosition);
      } else {
        // Moving from board to board
        const fromPosition = parsePositionKey(sourcePosition);
        if (card.cardData.guardian.type === 'Avatar') {
          moveAvatar(card.id, fromPosition, targetPosition);
        } else {
          moveCard(card.id, fromPosition, targetPosition);
        }
      }
    } else if (source === 'hand') {
      // Moving from hand to board
      if (card.cardData.guardian.type === 'Site') {
        placeCardOnSite(card, targetPosition);
      } else {
        placeUnitOnSite(card, targetPosition);
      }
      removeFromHand(card.id, card.owner);
    }
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <header className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Sorcery TCG</h1>
          <div className="text-sm text-gray-400">
            <kbd className="px-2 py-1 bg-gray-700 rounded">R</kbd> tap/untap
            <span className="mx-2">|</span>
            <kbd className="px-2 py-1 bg-gray-700 rounded">U</kbd> under/over
          </div>
        </header>

        <main className="flex-1 flex flex-col p-4 gap-4 overflow-hidden relative">
          {/* Opponent's hand and decks */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Hand player="opponent" size="small" />
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
              <DeckZone player="opponent" deckType="site" cards={opponentSiteDeck} />
              <DeckZone player="opponent" deckType="spell" cards={opponentSpellDeck} />
              <DiscardPile player="opponent" cards={opponentGraveyard} />
              <DeckImportButton player="opponent" />
            </div>
          </div>

          {/* Game board */}
          <div className="flex-1 flex items-center justify-center">
            <Board />
          </div>

          {/* Game controls */}
          <GameControls />

          {/* Player's hand and decks */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Hand player="player" size="small" />
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
              <DeckZone player="player" deckType="site" cards={playerSiteDeck} />
              <DeckZone player="player" deckType="spell" cards={playerSpellDeck} />
              <DiscardPile player="player" cards={playerGraveyard} />
              <DeckImportButton player="player" />
            </div>
          </div>

          {/* Card Preview Panel - Middle Left */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30">
            <CardPreview card={hoveredCard} />
          </div>

          {/* Player Stats Panel - Middle Right */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30">
            <PlayerStats />
          </div>
        </main>

        {/* Drag overlay for smooth dragging */}
        <DragOverlay>
          {activeCard && (
            <Card card={activeCard} size="medium" />
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

export default App;
