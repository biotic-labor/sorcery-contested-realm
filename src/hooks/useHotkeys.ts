import { useEffect, useRef } from 'react';
import { useGameStore } from './useGameState';
import { useGameActions } from './useGameActions';
import { useMultiplayerStore } from './useMultiplayer';

export function useHotkeys() {
  // Read-only state from store
  const { hoveredCard, hoveredDeck, board } = useGameStore();

  // Broadcasted actions from useGameActions
  const { rotateCard, toggleCardUnder, flipCard, drawCards, shuffleDeck, copyCard, raiseUnit, removeCardFromBoard, removeCardFromVertex } = useGameActions();

  // Perspective mapping for multiplayer
  const { localPlayer, connectionStatus, sendPing } = useMultiplayerStore();
  const isMultiplayer = connectionStatus === 'connected';
  const isGuest = isMultiplayer && localPlayer === 'opponent';

  // Track mouse position for ping
  const mousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mousePos.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore hotkeys when typing in an input or textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // E key to rotate hovered card
      if (event.key === 'e' || event.key === 'E') {
        if (hoveredCard) {
          rotateCard(hoveredCard.id);
        }
      }

      // R key to shuffle hovered deck
      if (event.key === 'r' || event.key === 'R') {
        if (hoveredDeck) {
          // Map UI player to data player (guest's "player" deck is stored in "opponent" slot)
          const dataPlayer = isGuest
            ? (hoveredDeck.player === 'player' ? 'opponent' : 'player')
            : hoveredDeck.player;
          shuffleDeck(dataPlayer, hoveredDeck.deckType);
        }
      }

      // U key to toggle card under/over site
      if (event.key === 'u' || event.key === 'U') {
        if (hoveredCard) {
          toggleCardUnder(hoveredCard.id);
        }
      }

      // F key to flip card face-down/face-up
      if (event.key === 'f' || event.key === 'F') {
        if (hoveredCard) {
          flipCard(hoveredCard.id);
        }
      }

      // Number keys 1-9 to draw cards from hovered deck
      if (event.key >= '1' && event.key <= '9' && hoveredDeck) {
        const count = parseInt(event.key, 10);
        // Map UI player to data player (guest's "player" deck is stored in "opponent" slot)
        const dataPlayer = isGuest
          ? (hoveredDeck.player === 'player' ? 'opponent' : 'player')
          : hoveredDeck.player;
        drawCards(dataPlayer, hoveredDeck.deckType, count);
      }

      // W key to ping at mouse location (relative to board)
      if (event.key === 'w' || event.key === 'W') {
        const board = document.querySelector('[data-board-grid]');
        if (board) {
          const rect = board.getBoundingClientRect();
          // Calculate position as percentage of board dimensions
          const xPercent = (mousePos.current.x - rect.left) / rect.width;
          const yPercent = (mousePos.current.y - rect.top) / rect.height;
          sendPing(xPercent, yPercent);
        }
      }

      // D key to duplicate hovered card
      if (event.key === 'd' || event.key === 'D') {
        if (hoveredCard) {
          // Map to data player for the copy
          const dataPlayer = isGuest
            ? (hoveredCard.owner === 'player' ? 'opponent' : 'player')
            : hoveredCard.owner;
          copyCard(hoveredCard, dataPlayer);
        }
      }

      // T key to raise hovered unit to top of stack
      if (event.key === 't' || event.key === 'T') {
        if (hoveredCard) {
          const cardType = hoveredCard.cardData.guardian.type;

          // Works on all units including avatars (they're in site.units now), but not sites
          if (cardType !== 'Site') {
            // Find unit position on board
            for (let rowIndex = 0; rowIndex < board.length; rowIndex++) {
              for (let colIndex = 0; colIndex < board[rowIndex].length; colIndex++) {
                const site = board[rowIndex][colIndex];
                const index = site.units.findIndex((u) => u.id === hoveredCard.id);
                if (index !== -1 && index < site.units.length - 1) {
                  raiseUnit(hoveredCard.id, { row: rowIndex, col: colIndex });
                  return;
                }
              }
            }
          }
        }
      }

      // Delete key to remove hovered card from board
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (hoveredCard) {
          const cardType = hoveredCard.cardData.guardian.type;

          // Don't allow deleting avatars
          if (cardType === 'Avatar') {
            return;
          }

          // Check if card is on a vertex
          const vertices = useGameStore.getState().vertices;
          for (const [vertexKey, units] of Object.entries(vertices)) {
            if (units.some((u) => u.id === hoveredCard.id)) {
              removeCardFromVertex(hoveredCard.id, vertexKey);
              return;
            }
          }

          // Check if card is on a board site
          for (let rowIndex = 0; rowIndex < board.length; rowIndex++) {
            for (let colIndex = 0; colIndex < board[rowIndex].length; colIndex++) {
              const site = board[rowIndex][colIndex];
              if (site.siteCard?.id === hoveredCard.id ||
                  site.units.some((u) => u.id === hoveredCard.id) ||
                  site.underCards.some((u) => u.id === hoveredCard.id)) {
                removeCardFromBoard(hoveredCard.id, { row: rowIndex, col: colIndex });
                return;
              }
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredCard, rotateCard, toggleCardUnder, flipCard, hoveredDeck, drawCards, shuffleDeck, copyCard, isGuest, sendPing, board, raiseUnit, removeCardFromBoard, removeCardFromVertex]);
}
