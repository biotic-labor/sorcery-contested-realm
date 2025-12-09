import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../useGameState';
import { CardInstance, CardData, CardVariant } from '../../types';

// Helper to create a mock card
function createMockCard(id: string, owner: 'player' | 'opponent'): CardInstance {
  const cardData: CardData = {
    name: 'Test Card',
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
    slug: 'test-card',
    finish: 'Standard',
    product: '',
    artist: '',
    flavorText: '',
    typeText: '',
  };

  return {
    id,
    cardData,
    variant,
    rotation: 0,
    owner,
  };
}

describe('useGameStore.adjustCardCounter', () => {
  beforeEach(() => {
    // Reset the store before each test
    useGameStore.getState().resetGame();
  });

  describe('on board units', () => {
    it('adds a counter to a card on the board', () => {
      const card = createMockCard('test-card-1', 'player');
      const store = useGameStore.getState();

      // Place card on board
      store.placeUnitOnSite(card, { row: 1, col: 1 });

      // Add counter
      store.adjustCardCounter('test-card-1', 1);

      // Verify counter was added
      const boardCard = useGameStore.getState().board[1][1].units[0];
      expect(boardCard.counters).toBe(1);
    });

    it('increments an existing counter', () => {
      const card = createMockCard('test-card-1', 'player');
      const store = useGameStore.getState();

      store.placeUnitOnSite(card, { row: 1, col: 1 });
      store.adjustCardCounter('test-card-1', 1);
      store.adjustCardCounter('test-card-1', 1);
      store.adjustCardCounter('test-card-1', 1);

      const boardCard = useGameStore.getState().board[1][1].units[0];
      expect(boardCard.counters).toBe(3);
    });

    it('decrements a counter', () => {
      const card = createMockCard('test-card-1', 'player');
      const store = useGameStore.getState();

      store.placeUnitOnSite(card, { row: 1, col: 1 });
      store.adjustCardCounter('test-card-1', 5);
      store.adjustCardCounter('test-card-1', -2);

      const boardCard = useGameStore.getState().board[1][1].units[0];
      expect(boardCard.counters).toBe(3);
    });

    it('removes counters property when counter reaches 0', () => {
      const card = createMockCard('test-card-1', 'player');
      const store = useGameStore.getState();

      store.placeUnitOnSite(card, { row: 1, col: 1 });
      store.adjustCardCounter('test-card-1', 3);
      store.adjustCardCounter('test-card-1', -3);

      const boardCard = useGameStore.getState().board[1][1].units[0];
      expect(boardCard.counters).toBeUndefined();
    });

    it('removes counters property when counter goes below 0', () => {
      const card = createMockCard('test-card-1', 'player');
      const store = useGameStore.getState();

      store.placeUnitOnSite(card, { row: 1, col: 1 });
      store.adjustCardCounter('test-card-1', 2);
      store.adjustCardCounter('test-card-1', -5);

      const boardCard = useGameStore.getState().board[1][1].units[0];
      expect(boardCard.counters).toBeUndefined();
    });
  });

  describe('on site cards', () => {
    it('adds a counter to a site card', () => {
      const siteCard: CardInstance = {
        ...createMockCard('test-site-1', 'player'),
        cardData: {
          ...createMockCard('test-site-1', 'player').cardData,
          guardian: {
            ...createMockCard('test-site-1', 'player').cardData.guardian,
            type: 'Site',
          },
        },
      };
      const store = useGameStore.getState();

      store.placeCardOnSite(siteCard, { row: 0, col: 0 });
      store.adjustCardCounter('test-site-1', 1);

      const boardSiteCard = useGameStore.getState().board[0][0].siteCard;
      expect(boardSiteCard?.counters).toBe(1);
    });
  });

  describe('on avatars', () => {
    it('adds a counter to an avatar', () => {
      const avatar: CardInstance = {
        ...createMockCard('test-avatar-1', 'player'),
        cardData: {
          ...createMockCard('test-avatar-1', 'player').cardData,
          guardian: {
            ...createMockCard('test-avatar-1', 'player').cardData.guardian,
            type: 'Avatar',
          },
        },
      };
      const store = useGameStore.getState();

      store.placeAvatar(avatar, { row: 3, col: 2 });
      store.adjustCardCounter('test-avatar-1', 2);

      const boardAvatar = useGameStore.getState().avatars['3-2'];
      expect(boardAvatar.counters).toBe(2);
    });
  });

  describe('on vertex units', () => {
    it('adds a counter to a card on a vertex', () => {
      const card = createMockCard('test-card-1', 'player');
      const store = useGameStore.getState();

      store.placeUnitOnVertex(card, 'v-1-1');
      store.adjustCardCounter('test-card-1', 3);

      const vertexCard = useGameStore.getState().vertices['v-1-1'][0];
      expect(vertexCard.counters).toBe(3);
    });
  });

  describe('on underCards', () => {
    it('adds a counter to a card tucked under a site', () => {
      const siteCard: CardInstance = {
        ...createMockCard('test-site-1', 'player'),
        cardData: {
          ...createMockCard('test-site-1', 'player').cardData,
          guardian: {
            ...createMockCard('test-site-1', 'player').cardData.guardian,
            type: 'Site',
          },
        },
      };
      const unitCard = createMockCard('test-unit-1', 'player');
      const store = useGameStore.getState();

      // Place site and unit
      store.placeCardOnSite(siteCard, { row: 0, col: 0 });
      store.placeUnitOnSite(unitCard, { row: 0, col: 0 });

      // Toggle unit under site
      store.toggleCardUnder('test-unit-1');

      // Add counter to under card
      store.adjustCardCounter('test-unit-1', 1);

      const underCard = useGameStore.getState().board[0][0].underCards[0];
      expect(underCard.counters).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('does nothing when card is not found', () => {
      const store = useGameStore.getState();

      // Should not throw
      expect(() => store.adjustCardCounter('non-existent-card', 1)).not.toThrow();
    });

    it('handles multiple cards with different counters', () => {
      const card1 = createMockCard('card-1', 'player');
      const card2 = createMockCard('card-2', 'player');
      const store = useGameStore.getState();

      store.placeUnitOnSite(card1, { row: 0, col: 0 });
      store.placeUnitOnSite(card2, { row: 0, col: 1 });

      store.adjustCardCounter('card-1', 5);
      store.adjustCardCounter('card-2', 10);

      const boardCard1 = useGameStore.getState().board[0][0].units[0];
      const boardCard2 = useGameStore.getState().board[0][1].units[0];

      expect(boardCard1.counters).toBe(5);
      expect(boardCard2.counters).toBe(10);
    });

    it('preserves other card properties when updating counter', () => {
      const card = createMockCard('test-card-1', 'player');
      card.rotation = 90; // Tapped
      const store = useGameStore.getState();

      store.placeUnitOnSite(card, { row: 1, col: 1 });
      store.adjustCardCounter('test-card-1', 1);

      const boardCard = useGameStore.getState().board[1][1].units[0];
      expect(boardCard.id).toBe('test-card-1');
      expect(boardCard.owner).toBe('player');
      expect(boardCard.rotation).toBe(90);
      expect(boardCard.counters).toBe(1);
      expect(boardCard.cardData.name).toBe('Test Card');
    });
  });
});
