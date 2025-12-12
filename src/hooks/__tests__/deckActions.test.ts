import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../useGameState';
import { CardInstance, CardData, CardVariant } from '../../types';

function createMockCard(id: string, owner: 'player' | 'opponent'): CardInstance {
  const cardData: CardData = {
    name: `Card ${id}`,
    guardian: {
      rarity: 'Ordinary',
      type: 'Minion',
      rulesText: '',
      cost: 3,
      attack: 2,
      defence: 2,
      life: null,
      thresholds: { air: 0, earth: 0, fire: 0, water: 0 },
    },
    elements: '',
    subTypes: '',
    sets: [],
  };

  const variant: CardVariant = {
    slug: `card-${id}`,
    finish: 'Standard',
    product: '',
    artist: '',
    flavorText: '',
    typeText: '',
  };

  return { id, cardData, variant, rotation: 0, owner };
}

describe('deckActions', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe('drawCards', () => {
    it('draws cards from site deck to hand', () => {
      const cards = [createMockCard('c1', 'player'), createMockCard('c2', 'player')];
      useGameStore.setState({ playerSiteDeck: cards, playerHand: [] });

      useGameStore.getState().drawCards('player', 'site', 1);

      const state = useGameStore.getState();
      expect(state.playerHand).toHaveLength(1);
      expect(state.playerHand[0].id).toBe('c1');
      expect(state.playerSiteDeck).toHaveLength(1);
      expect(state.playerSiteDeck[0].id).toBe('c2');
    });

    it('draws multiple cards', () => {
      const cards = [
        createMockCard('c1', 'player'),
        createMockCard('c2', 'player'),
        createMockCard('c3', 'player'),
      ];
      useGameStore.setState({ playerSpellDeck: cards, playerHand: [] });

      useGameStore.getState().drawCards('player', 'spell', 2);

      const state = useGameStore.getState();
      expect(state.playerHand).toHaveLength(2);
      expect(state.playerSpellDeck).toHaveLength(1);
    });

    it('draws from opponent deck', () => {
      const cards = [createMockCard('c1', 'opponent'), createMockCard('c2', 'opponent')];
      useGameStore.setState({ opponentSiteDeck: cards, opponentHand: [] });

      useGameStore.getState().drawCards('opponent', 'site', 1);

      const state = useGameStore.getState();
      expect(state.opponentHand).toHaveLength(1);
      expect(state.opponentSiteDeck).toHaveLength(1);
    });

    it('tags drawn cards with sourceDeck', () => {
      const cards = [createMockCard('c1', 'player')];
      useGameStore.setState({ playerSiteDeck: cards, playerHand: [] });

      useGameStore.getState().drawCards('player', 'site', 1);

      const state = useGameStore.getState();
      expect(state.playerHand[0].sourceDeck).toBe('site');
    });

    it('handles drawing more than available', () => {
      const cards = [createMockCard('c1', 'player')];
      useGameStore.setState({ playerSiteDeck: cards, playerHand: [] });

      useGameStore.getState().drawCards('player', 'site', 5);

      const state = useGameStore.getState();
      expect(state.playerHand).toHaveLength(1);
      expect(state.playerSiteDeck).toHaveLength(0);
    });

    it('handles drawing from empty deck', () => {
      useGameStore.setState({ playerSiteDeck: [], playerHand: [] });

      useGameStore.getState().drawCards('player', 'site', 1);

      const state = useGameStore.getState();
      expect(state.playerHand).toHaveLength(0);
    });
  });

  describe('putCardOnTop', () => {
    it('puts card on top of deck', () => {
      const existing = [createMockCard('c1', 'player')];
      const newCard = createMockCard('c2', 'player');
      useGameStore.setState({ playerSiteDeck: existing });

      useGameStore.getState().putCardOnTop(newCard, 'player', 'site');

      const state = useGameStore.getState();
      expect(state.playerSiteDeck).toHaveLength(2);
      expect(state.playerSiteDeck[0].id).toBe('c2');
      expect(state.playerSiteDeck[1].id).toBe('c1');
    });

    it('works on empty deck', () => {
      const newCard = createMockCard('c1', 'player');
      useGameStore.setState({ playerSpellDeck: [] });

      useGameStore.getState().putCardOnTop(newCard, 'player', 'spell');

      const state = useGameStore.getState();
      expect(state.playerSpellDeck).toHaveLength(1);
    });
  });

  describe('putCardOnBottom', () => {
    it('puts card on bottom of deck', () => {
      const existing = [createMockCard('c1', 'player')];
      const newCard = createMockCard('c2', 'player');
      useGameStore.setState({ playerSiteDeck: existing });

      useGameStore.getState().putCardOnBottom(newCard, 'player', 'site');

      const state = useGameStore.getState();
      expect(state.playerSiteDeck).toHaveLength(2);
      expect(state.playerSiteDeck[0].id).toBe('c1');
      expect(state.playerSiteDeck[1].id).toBe('c2');
    });
  });

  describe('peekDeck', () => {
    it('returns top cards and removes them from deck', () => {
      const cards = [
        createMockCard('c1', 'player'),
        createMockCard('c2', 'player'),
        createMockCard('c3', 'player'),
      ];
      useGameStore.setState({ playerSiteDeck: cards });

      const peeked = useGameStore.getState().peekDeck('player', 'site', 2);

      expect(peeked).toHaveLength(2);
      expect(peeked[0].id).toBe('c1');
      expect(peeked[1].id).toBe('c2');

      const state = useGameStore.getState();
      expect(state.playerSiteDeck).toHaveLength(1);
      expect(state.playerSiteDeck[0].id).toBe('c3');
    });

    it('peeks entire deck with count -1', () => {
      const cards = [
        createMockCard('c1', 'player'),
        createMockCard('c2', 'player'),
      ];
      useGameStore.setState({ playerSpellDeck: cards });

      const peeked = useGameStore.getState().peekDeck('player', 'spell', -1);

      expect(peeked).toHaveLength(2);
      expect(useGameStore.getState().playerSpellDeck).toHaveLength(0);
    });
  });

  describe('returnCardsToDeck', () => {
    it('returns cards to top of deck', () => {
      const existing = [createMockCard('c1', 'player')];
      const returning = [createMockCard('c2', 'player'), createMockCard('c3', 'player')];
      useGameStore.setState({ playerSiteDeck: existing });

      useGameStore.getState().returnCardsToDeck(returning, 'player', 'site', 'top');

      const state = useGameStore.getState();
      expect(state.playerSiteDeck).toHaveLength(3);
      expect(state.playerSiteDeck[0].id).toBe('c2');
      expect(state.playerSiteDeck[1].id).toBe('c3');
      expect(state.playerSiteDeck[2].id).toBe('c1');
    });

    it('returns cards to bottom of deck', () => {
      const existing = [createMockCard('c1', 'player')];
      const returning = [createMockCard('c2', 'player'), createMockCard('c3', 'player')];
      useGameStore.setState({ playerSiteDeck: existing });

      useGameStore.getState().returnCardsToDeck(returning, 'player', 'site', 'bottom');

      const state = useGameStore.getState();
      expect(state.playerSiteDeck).toHaveLength(3);
      expect(state.playerSiteDeck[0].id).toBe('c1');
      expect(state.playerSiteDeck[1].id).toBe('c2');
      expect(state.playerSiteDeck[2].id).toBe('c3');
    });
  });

  describe('removeTopCardFromDeck', () => {
    it('removes and returns top card', () => {
      const cards = [createMockCard('c1', 'player'), createMockCard('c2', 'player')];
      useGameStore.setState({ playerSiteDeck: cards });

      const removed = useGameStore.getState().removeTopCardFromDeck('player', 'site');

      expect(removed?.id).toBe('c1');
      expect(useGameStore.getState().playerSiteDeck).toHaveLength(1);
      expect(useGameStore.getState().playerSiteDeck[0].id).toBe('c2');
    });

    it('returns null for empty deck', () => {
      useGameStore.setState({ playerSiteDeck: [] });

      const removed = useGameStore.getState().removeTopCardFromDeck('player', 'site');

      expect(removed).toBeNull();
    });
  });

  describe('removeCardFromDeckById', () => {
    it('removes card by ID and returns true', () => {
      const cards = [
        createMockCard('c1', 'player'),
        createMockCard('c2', 'player'),
        createMockCard('c3', 'player'),
      ];
      useGameStore.setState({ playerSpellDeck: cards });

      const result = useGameStore.getState().removeCardFromDeckById('c2', 'player', 'spell');

      expect(result).toBe(true);
      const state = useGameStore.getState();
      expect(state.playerSpellDeck).toHaveLength(2);
      expect(state.playerSpellDeck.map(c => c.id)).toEqual(['c1', 'c3']);
    });

    it('returns false if card not found', () => {
      const cards = [createMockCard('c1', 'player')];
      useGameStore.setState({ playerSpellDeck: cards });

      const result = useGameStore.getState().removeCardFromDeckById('nonexistent', 'player', 'spell');

      expect(result).toBe(false);
      expect(useGameStore.getState().playerSpellDeck).toHaveLength(1);
    });
  });

  describe('shuffleDeck', () => {
    it('shuffles deck and sets shufflingDeck state', async () => {
      const cards = [
        createMockCard('c1', 'player'),
        createMockCard('c2', 'player'),
        createMockCard('c3', 'player'),
        createMockCard('c4', 'player'),
        createMockCard('c5', 'player'),
      ];
      useGameStore.setState({ playerSiteDeck: cards, shufflingDeck: null });

      useGameStore.getState().shuffleDeck('player', 'site');

      // Should set shuffling state
      expect(useGameStore.getState().shufflingDeck).toEqual({ player: 'player', deckType: 'site' });

      // Deck should still have same number of cards
      expect(useGameStore.getState().playerSiteDeck).toHaveLength(5);

      // Wait for shuffling state to clear
      await new Promise(resolve => setTimeout(resolve, 700));
      expect(useGameStore.getState().shufflingDeck).toBeNull();
    });
  });
});
