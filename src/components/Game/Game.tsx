import { DndContext, DragEndEvent, DragStartEvent, DragMoveEvent, DragOverlay, Modifier } from '@dnd-kit/core';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Board } from '../Board';
import { Hand } from '../Hand';
import { GameControls } from '../GameControls';
import { CardPreview } from '../CardPreview';
import { PlayerStats } from '../PlayerStats';
import { DeckZone } from '../DeckZone';
import { DiscardPile } from '../DiscardPile';
import { DeckImportButton } from '../DeckImport';
import { GameLog } from '../GameLog';
import { SpellStack } from '../SpellStack';
import { Card } from '../Card';
import { useGameStore } from '../../hooks/useGameState';
import { useGameActions } from '../../hooks/useGameActions';
import { useHotkeys } from '../../hooks/useHotkeys';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';
import { CardInstance, parsePositionKey, Player, DeckType } from '../../types';
import { createMockCards, createMockAvatar } from '../../utils/mockData';
import { peerService } from '../../services/peerService';

interface GameProps {
  onLeave: () => void;
}

export function Game({ onLeave }: GameProps) {
  const [activeCard, setActiveCard] = useState<CardInstance | null>(null);
  const initialized = useRef(false);

  // Get state from game store (read-only)
  const {
    hoveredCard,
    playerSiteDeck,
    playerSpellDeck,
    opponentSiteDeck,
    opponentSpellDeck,
    playerGraveyard,
    opponentGraveyard,
  } = useGameStore();

  // Get actions from useGameActions (broadcasts in multiplayer)
  const {
    placeCardOnSite,
    placeUnitOnSite,
    moveCard,
    removeFromHand,
    reorderHand,
    addToHand,
    putCardOnTop,
    putCardOnBottom,
    addToGraveyard,
    removeFromGraveyard,
    addToSpellStack,
    removeFromSpellStack,
    removeCardFromBoard,
    placeAvatar,
    moveAvatar,
    placeUnitOnVertex,
    removeCardFromVertex,
  } = useGameActions();

  const {
    connectionStatus,
    opponentNickname,
    disconnect,
    localPlayer,
    setOpponentDrag,
    disconnectTime,
  } = useMultiplayerStore();

  const isMultiplayer = connectionStatus === 'connected';

  // Track if current drag is from board (set during dragStart)
  const isDraggingFromBoard = useRef(false);

  // Custom modifier to fix DragOverlay offset when Player 2 drags from rotated board
  const rotatedBoardModifier: Modifier = useCallback(({ transform, activeNodeRect }) => {
    const isGuest = isMultiplayer && localPlayer === 'opponent';

    // Only apply fix for Player 2 dragging from the board
    if (!isGuest || !isDraggingFromBoard.current || !activeNodeRect) {
      return transform;
    }

    // The board is rotated 180deg, so the pointer offset within the card is inverted.
    // We need to shift by the card's dimensions to compensate.
    return {
      ...transform,
      x: transform.x - activeNodeRect.width,
      y: transform.y - activeNodeRect.height,
    };
  }, [isMultiplayer, localPlayer]);

  // Perspective mapping - guest sees swapped data sources
  // Game state uses "player" for host, "opponent" for guest
  // UI should show YOUR stuff at bottom, THEIR stuff at top
  const isGuest = isMultiplayer && localPlayer === 'opponent';

  // "My" data (shown at bottom of screen)
  const mySiteDeck = isGuest ? opponentSiteDeck : playerSiteDeck;
  const mySpellDeck = isGuest ? opponentSpellDeck : playerSpellDeck;
  const myGraveyard = isGuest ? opponentGraveyard : playerGraveyard;

  // "Their" data (shown at top of screen)
  const theirSiteDeck = isGuest ? playerSiteDeck : opponentSiteDeck;
  const theirSpellDeck = isGuest ? playerSpellDeck : opponentSpellDeck;
  const theirGraveyard = isGuest ? playerGraveyard : opponentGraveyard;

  // Initialize hotkeys
  useHotkeys();

  // Load mock data on mount (once only) - only for single player mode
  useEffect(() => {
    if (initialized.current) return;
    if (isMultiplayer) {
      initialized.current = true;
      return;
    }

    initialized.current = true;

    const mockCards = createMockCards();
    mockCards.forEach((card) => addToHand(card, 'player'));

    const avatar = createMockAvatar('player');
    placeAvatar(avatar, { row: 3, col: 2 });
  }, [addToHand, placeAvatar, isMultiplayer]);

  // Throttle drag move events to avoid flooding the connection
  const lastDragBroadcast = useRef<number>(0);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = active.data.current?.card as CardInstance | undefined;
    const source = active.data.current?.source as string | undefined;
    const sourcePosition = active.data.current?.sourcePosition as string | undefined;

    // Track if dragging from board for the modifier
    isDraggingFromBoard.current = source === 'board';

    if (card) {
      setActiveCard(card);

      // Clear any stale opponent drag ghost when we start dragging
      if (isMultiplayer) {
        setOpponentDrag(null);
        // Only broadcast card data for cards from visible zones (board, graveyard, spell-stack).
        // Cards from hand are hidden - don't leak what card is being played.
        const isFromVisibleZone = source === 'board' || source === 'graveyard' || source === 'spell-stack';
        peerService.send({
          type: 'drag_start',
          cardId: card.id,
          cardData: isFromVisibleZone ? card.cardData : undefined,
          from: sourcePosition || source || 'hand',
        });
      }
    }
  };

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    if (!isMultiplayer || !activeCard) return;

    // Throttle to ~30fps
    const now = Date.now();
    if (now - lastDragBroadcast.current < 33) return;
    lastDragBroadcast.current = now;

    const { activatorEvent } = event;
    if (activatorEvent instanceof PointerEvent) {
      peerService.send({
        type: 'drag_move',
        x: activatorEvent.clientX,
        y: activatorEvent.clientY,
      });
    }
  }, [isMultiplayer, activeCard]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    // Broadcast drag end in multiplayer
    if (isMultiplayer) {
      peerService.send({
        type: 'drag_end',
        to: over?.id as string || null,
      });
    }

    if (!over) return;

    const card = active.data.current?.card as CardInstance | undefined;
    const source = active.data.current?.source as string | undefined;
    const sourcePosition = active.data.current?.sourcePosition as string | undefined;
    const activeIndex = active.data.current?.index as number | undefined;
    const activePlayer = active.data.current?.player as Player | undefined;
    const sourcePlayer = active.data.current?.sourcePlayer as Player | undefined;

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

    // Map UI player to data player (guest's "player" UI targets are stored in "opponent" data slot)
    const mapUiPlayerToData = (uiPlayer: Player): Player => {
      return isGuest ? (uiPlayer === 'player' ? 'opponent' : 'player') : uiPlayer;
    };

    // Check if dropping on a deck (put card back)
    if (overId.startsWith('deck-')) {
      const parts = overId.split('-');
      const deckPlayer = mapUiPlayerToData(parts[1] as Player);
      const deckType = parts[2] as DeckType;

      const isRightClick = event.activatorEvent instanceof PointerEvent && event.activatorEvent.button === 2;

      if (isRightClick) {
        putCardOnBottom(card, deckPlayer, deckType);
      } else {
        putCardOnTop(card, deckPlayer, deckType);
      }

      if (source === 'hand') {
        removeFromHand(card.id, card.owner);
      } else if (source === 'board' && sourcePosition) {
        if (sourcePosition.startsWith('v-')) {
          removeCardFromVertex(card.id, sourcePosition);
        } else {
          const fromPosition = parsePositionKey(sourcePosition);
          removeCardFromBoard(card.id, fromPosition);
        }
      } else if (source === 'graveyard' && sourcePlayer) {
        removeFromGraveyard(card.id, sourcePlayer);
      } else if (source === 'spell-stack' && sourcePlayer) {
        removeFromSpellStack(card.id, sourcePlayer);
      }
      return;
    }

    // Check if dropping on a discard pile
    if (overId.startsWith('discard-')) {
      const discardPlayer = mapUiPlayerToData(overId.split('-')[1] as Player);

      addToGraveyard(card, discardPlayer);

      if (source === 'hand') {
        removeFromHand(card.id, card.owner);
      } else if (source === 'board' && sourcePosition) {
        if (sourcePosition.startsWith('v-')) {
          removeCardFromVertex(card.id, sourcePosition);
        } else {
          const fromPosition = parsePositionKey(sourcePosition);
          removeCardFromBoard(card.id, fromPosition);
        }
      } else if (source === 'graveyard' && sourcePlayer) {
        removeFromGraveyard(card.id, sourcePlayer);
      } else if (source === 'spell-stack' && sourcePlayer) {
        removeFromSpellStack(card.id, sourcePlayer);
      }
      return;
    }

    // Check if dropping on a hand
    if (overId.startsWith('hand-')) {
      const handPlayer = mapUiPlayerToData(overId.split('-')[1] as Player);

      addToHand(card, handPlayer);

      if (source === 'board' && sourcePosition) {
        if (sourcePosition.startsWith('v-')) {
          removeCardFromVertex(card.id, sourcePosition);
        } else {
          const fromPosition = parsePositionKey(sourcePosition);
          removeCardFromBoard(card.id, fromPosition);
        }
      } else if (source === 'graveyard' && sourcePlayer) {
        removeFromGraveyard(card.id, sourcePlayer);
      } else if (source === 'spell-stack' && sourcePlayer) {
        removeFromSpellStack(card.id, sourcePlayer);
      }
      return;
    }

    // Check if dropping on a spell stack (casting zone)
    if (overId.startsWith('spell-stack-')) {
      const uiStackPlayer = overId.split('-')[2] as Player;

      // Only allow dropping on your own spell stack
      if (uiStackPlayer !== 'player') {
        return;
      }

      const stackPlayer = mapUiPlayerToData(uiStackPlayer);

      addToSpellStack(card, stackPlayer);

      if (source === 'hand') {
        removeFromHand(card.id, card.owner);
      } else if (source === 'board' && sourcePosition) {
        if (sourcePosition.startsWith('v-')) {
          removeCardFromVertex(card.id, sourcePosition);
        } else {
          const fromPosition = parsePositionKey(sourcePosition);
          removeCardFromBoard(card.id, fromPosition);
        }
      } else if (source === 'graveyard' && sourcePlayer) {
        removeFromGraveyard(card.id, sourcePlayer);
      } else if (source === 'spell-stack' && sourcePlayer) {
        removeFromSpellStack(card.id, sourcePlayer);
      }
      return;
    }

    // Check if dropping on a vertex
    if (overId.startsWith('v-')) {
      const cardType = card.cardData.guardian.type;
      if (cardType === 'Site' || cardType === 'Avatar') {
        return;
      }

      const vertexId = overId as string;

      placeUnitOnVertex(card, vertexId);

      if (source === 'hand') {
        removeFromHand(card.id, card.owner);
      } else if (source === 'board' && sourcePosition) {
        if (sourcePosition.startsWith('v-')) {
          removeCardFromVertex(card.id, sourcePosition);
        } else {
          const fromPosition = parsePositionKey(sourcePosition);
          removeCardFromBoard(card.id, fromPosition);
        }
      } else if (source === 'graveyard' && sourcePlayer) {
        removeFromGraveyard(card.id, sourcePlayer);
      } else if (source === 'spell-stack' && sourcePlayer) {
        removeFromSpellStack(card.id, sourcePlayer);
      }
      return;
    }

    // Check if dropping on a board position
    if (!overId.includes('-')) return;

    const targetPosition = parsePositionKey(overId);

    if (source === 'board' && sourcePosition === over.id) {
      return;
    }

    if (source === 'board' && sourcePosition) {
      if (sourcePosition.startsWith('v-')) {
        placeUnitOnSite(card, targetPosition);
        removeCardFromVertex(card.id, sourcePosition);
      } else {
        const fromPosition = parsePositionKey(sourcePosition);
        if (card.cardData.guardian.type === 'Avatar') {
          moveAvatar(card.id, fromPosition, targetPosition);
        } else {
          moveCard(card.id, fromPosition, targetPosition);
        }
      }
    } else if (source === 'hand') {
      if (card.cardData.guardian.type === 'Site') {
        placeCardOnSite(card, targetPosition);
      } else {
        placeUnitOnSite(card, targetPosition);
      }
      removeFromHand(card.id, card.owner);
    } else if (source === 'graveyard' && sourcePlayer) {
      if (card.cardData.guardian.type === 'Site') {
        placeCardOnSite(card, targetPosition);
      } else {
        placeUnitOnSite(card, targetPosition);
      }
      removeFromGraveyard(card.id, sourcePlayer);
    } else if (source === 'spell-stack' && sourcePlayer) {
      if (card.cardData.guardian.type === 'Site') {
        placeCardOnSite(card, targetPosition);
      } else {
        placeUnitOnSite(card, targetPosition);
      }
      removeFromSpellStack(card.id, sourcePlayer);
    }
  };

  const handleLeave = () => {
    if (isMultiplayer) {
      disconnect();
    }
    onLeave();
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        {/* Disconnect notification banner - in document flow so it pushes content down */}
        {connectionStatus === 'disconnected' && disconnectTime && (
          <div className="bg-yellow-600 text-white py-2 px-4 text-center">
            Opponent disconnected. Waiting for reconnection...
          </div>
        )}

        <header className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLeave}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              Leave
            </button>
            <h1 className="text-2xl font-bold">Sorcery TCG</h1>
            {isMultiplayer && opponentNickname && (
              <span className="text-gray-400">vs {opponentNickname}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {isMultiplayer && (
              <span className="text-sm text-green-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                Connected
              </span>
            )}
            <div className="text-sm text-gray-400">
              <kbd className="px-2 py-1 bg-gray-700 rounded">E</kbd> tap/untap
              <span className="mx-2">|</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded">U</kbd> under/over
              <span className="mx-2">|</span>
              <kbd className="px-2 py-1 bg-gray-700 rounded">R</kbd> shuffle
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col p-4 gap-4 overflow-hidden relative">
          {/* Opponent's hand and decks (top of screen) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Hand player="opponent" size="small" />
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
              <DeckZone player="opponent" deckType="site" cards={theirSiteDeck} />
              <DeckZone player="opponent" deckType="spell" cards={theirSpellDeck} />
              <DiscardPile player="opponent" cards={theirGraveyard} />
              {!isMultiplayer && <DeckImportButton player="opponent" />}
            </div>
          </div>

          {/* Game board */}
          <div className="flex-1 flex items-center justify-center">
            <Board />
          </div>

          {/* Game controls */}
          <GameControls />

          {/* Your hand and decks (bottom of screen) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Hand player="player" size="small" />
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
              <DeckZone player="player" deckType="site" cards={mySiteDeck} />
              <DeckZone player="player" deckType="spell" cards={mySpellDeck} />
              <DiscardPile player="player" cards={myGraveyard} />
              <DeckImportButton player="player" />
            </div>
          </div>

          {/* Card Preview Panel */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30">
            <CardPreview card={hoveredCard} />
          </div>

          {/* Right side: Spell Stacks and Player Stats */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex items-center gap-4">
            {/* Spell Stacks (casting zones) */}
            <div className="flex flex-col gap-4">
              <SpellStack player="opponent" />
              <SpellStack player="player" />
            </div>
            <PlayerStats />
          </div>
        </main>

        {/* Game Log (chat + history) */}
        <GameLog />
      </div>

      {/* Drag overlay - shows card being dragged */}
      <DragOverlay modifiers={[rotatedBoardModifier]}>
        {activeCard && (
          <Card card={activeCard} size="medium" />
        )}
      </DragOverlay>
    </DndContext>
  );
}
