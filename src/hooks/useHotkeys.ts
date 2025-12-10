import { useEffect, useRef } from 'react';
import { useGameStore } from './useGameState';
import { useGameActions } from './useGameActions';
import { useMultiplayerStore } from './useMultiplayer';

export function useHotkeys() {
  // Read-only state from store
  const { hoveredCard, selectedCard, hoveredDeck } = useGameStore();

  // Broadcasted actions from useGameActions
  const { rotateCard, toggleCardUnder, drawCards, shuffleDeck } = useGameActions();

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
      // E key to rotate hovered or selected card
      if (event.key === 'e' || event.key === 'E') {
        const targetCard = hoveredCard || selectedCard;
        if (targetCard) {
          rotateCard(targetCard.id);
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
        const targetCard = hoveredCard || selectedCard;
        if (targetCard) {
          toggleCardUnder(targetCard.id);
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredCard, selectedCard, rotateCard, toggleCardUnder, hoveredDeck, drawCards, shuffleDeck, isGuest, sendPing]);
}
