import { useEffect } from 'react';
import { useGameStore } from './useGameState';
import { useGameActions } from './useGameActions';
import { useMultiplayerStore } from './useMultiplayer';

export function useHotkeys() {
  // Read-only state from store
  const { hoveredCard, selectedCard, hoveredDeck } = useGameStore();

  // Broadcasted actions from useGameActions
  const { rotateCard, toggleCardUnder, drawCards, shuffleDeck } = useGameActions();

  // Perspective mapping for multiplayer
  const { localPlayer, connectionStatus } = useMultiplayerStore();
  const isMultiplayer = connectionStatus === 'connected';
  const isGuest = isMultiplayer && localPlayer === 'opponent';

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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredCard, selectedCard, rotateCard, toggleCardUnder, hoveredDeck, drawCards, shuffleDeck, isGuest]);
}
