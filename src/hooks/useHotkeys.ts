import { useEffect } from 'react';
import { useGameStore } from './useGameState';

export function useHotkeys() {
  const { hoveredCard, selectedCard, rotateCard, toggleCardUnder, hoveredDeck, drawCards, shuffleDeck } = useGameStore();

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
          shuffleDeck(hoveredDeck.player, hoveredDeck.deckType);
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
        drawCards(hoveredDeck.player, hoveredDeck.deckType, count);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredCard, selectedCard, rotateCard, toggleCardUnder, hoveredDeck, drawCards, shuffleDeck]);
}
