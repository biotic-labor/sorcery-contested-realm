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

describe('zoneActions', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe('hand operations', () => {
    describe('addToHand', () => {
      it('adds card to player hand', () => {
        const card = createMockCard('c1', 'player');
        useGameStore.getState().addToHand(card, 'player');

        expect(useGameStore.getState().playerHand).toHaveLength(1);
        expect(useGameStore.getState().playerHand[0].id).toBe('c1');
      });

      it('adds card to opponent hand', () => {
        const card = createMockCard('c1', 'opponent');
        useGameStore.getState().addToHand(card, 'opponent');

        expect(useGameStore.getState().opponentHand).toHaveLength(1);
      });

      it('appends to existing hand', () => {
        const card1 = createMockCard('c1', 'player');
        const card2 = createMockCard('c2', 'player');

        useGameStore.getState().addToHand(card1, 'player');
        useGameStore.getState().addToHand(card2, 'player');

        expect(useGameStore.getState().playerHand).toHaveLength(2);
        expect(useGameStore.getState().playerHand[1].id).toBe('c2');
      });
    });

    describe('removeFromHand', () => {
      it('removes card from player hand', () => {
        const cards = [createMockCard('c1', 'player'), createMockCard('c2', 'player')];
        useGameStore.setState({ playerHand: cards });

        useGameStore.getState().removeFromHand('c1', 'player');

        expect(useGameStore.getState().playerHand).toHaveLength(1);
        expect(useGameStore.getState().playerHand[0].id).toBe('c2');
      });

      it('does nothing if card not in hand', () => {
        const cards = [createMockCard('c1', 'player')];
        useGameStore.setState({ playerHand: cards });

        useGameStore.getState().removeFromHand('nonexistent', 'player');

        expect(useGameStore.getState().playerHand).toHaveLength(1);
      });
    });

    describe('reorderHand', () => {
      it('moves card to new position', () => {
        const cards = [
          createMockCard('c1', 'player'),
          createMockCard('c2', 'player'),
          createMockCard('c3', 'player'),
        ];
        useGameStore.setState({ playerHand: cards });

        useGameStore.getState().reorderHand('player', 0, 2);

        const hand = useGameStore.getState().playerHand;
        expect(hand.map(c => c.id)).toEqual(['c2', 'c3', 'c1']);
      });

      it('moves card earlier in hand', () => {
        const cards = [
          createMockCard('c1', 'player'),
          createMockCard('c2', 'player'),
          createMockCard('c3', 'player'),
        ];
        useGameStore.setState({ playerHand: cards });

        useGameStore.getState().reorderHand('player', 2, 0);

        const hand = useGameStore.getState().playerHand;
        expect(hand.map(c => c.id)).toEqual(['c3', 'c1', 'c2']);
      });
    });
  });

  describe('graveyard operations', () => {
    describe('addToGraveyard', () => {
      it('adds card to player graveyard', () => {
        const card = createMockCard('c1', 'player');
        useGameStore.getState().addToGraveyard(card, 'player');

        expect(useGameStore.getState().playerGraveyard).toHaveLength(1);
      });

      it('adds card to opponent graveyard', () => {
        const card = createMockCard('c1', 'opponent');
        useGameStore.getState().addToGraveyard(card, 'opponent');

        expect(useGameStore.getState().opponentGraveyard).toHaveLength(1);
      });
    });

    describe('removeFromGraveyard', () => {
      it('removes and returns card from graveyard', () => {
        const cards = [createMockCard('c1', 'player'), createMockCard('c2', 'player')];
        useGameStore.setState({ playerGraveyard: cards });

        const removed = useGameStore.getState().removeFromGraveyard('c1', 'player');

        expect(removed?.id).toBe('c1');
        expect(useGameStore.getState().playerGraveyard).toHaveLength(1);
      });

      it('returns null if card not found', () => {
        useGameStore.setState({ playerGraveyard: [] });

        const removed = useGameStore.getState().removeFromGraveyard('nonexistent', 'player');

        expect(removed).toBeNull();
      });
    });
  });

  describe('collection operations', () => {
    describe('addToCollection', () => {
      it('adds card to player collection', () => {
        const card = createMockCard('c1', 'player');
        useGameStore.getState().addToCollection(card, 'player');

        expect(useGameStore.getState().playerCollection).toHaveLength(1);
      });
    });

    describe('removeFromCollection', () => {
      it('removes and returns card from collection', () => {
        const cards = [createMockCard('c1', 'player')];
        useGameStore.setState({ playerCollection: cards });

        const removed = useGameStore.getState().removeFromCollection('c1', 'player');

        expect(removed?.id).toBe('c1');
        expect(useGameStore.getState().playerCollection).toHaveLength(0);
      });
    });
  });

  describe('spell stack operations', () => {
    describe('addToSpellStack', () => {
      it('adds card to player spell stack', () => {
        const card = createMockCard('c1', 'player');
        useGameStore.getState().addToSpellStack(card, 'player');

        expect(useGameStore.getState().playerSpellStack).toHaveLength(1);
      });

      it('adds card to opponent spell stack', () => {
        const card = createMockCard('c1', 'opponent');
        useGameStore.getState().addToSpellStack(card, 'opponent');

        expect(useGameStore.getState().opponentSpellStack).toHaveLength(1);
      });
    });

    describe('removeFromSpellStack', () => {
      it('removes and returns card from spell stack', () => {
        const cards = [createMockCard('c1', 'player'), createMockCard('c2', 'player')];
        useGameStore.setState({ playerSpellStack: cards });

        const removed = useGameStore.getState().removeFromSpellStack('c2', 'player');

        expect(removed?.id).toBe('c2');
        expect(useGameStore.getState().playerSpellStack).toHaveLength(1);
      });
    });

    describe('clearSpellStack', () => {
      it('clears player spell stack', () => {
        const cards = [createMockCard('c1', 'player'), createMockCard('c2', 'player')];
        useGameStore.setState({ playerSpellStack: cards });

        useGameStore.getState().clearSpellStack('player');

        expect(useGameStore.getState().playerSpellStack).toHaveLength(0);
      });

      it('does not affect opponent spell stack', () => {
        useGameStore.setState({
          playerSpellStack: [createMockCard('c1', 'player')],
          opponentSpellStack: [createMockCard('c2', 'opponent')],
        });

        useGameStore.getState().clearSpellStack('player');

        expect(useGameStore.getState().opponentSpellStack).toHaveLength(1);
      });
    });
  });

  describe('copyCard', () => {
    it('creates copy with new ID in spell stack', () => {
      const original = createMockCard('c1', 'player');

      const copy = useGameStore.getState().copyCard(original, 'player');

      expect(copy.id).not.toBe('c1');
      expect(copy.cardData.name).toBe(original.cardData.name);
      expect(useGameStore.getState().playerSpellStack).toHaveLength(1);
      expect(useGameStore.getState().playerSpellStack[0].id).toBe(copy.id);
    });

    it('copies to opponent spell stack', () => {
      const original = createMockCard('c1', 'opponent');

      useGameStore.getState().copyCard(original, 'opponent');

      expect(useGameStore.getState().opponentSpellStack).toHaveLength(1);
    });
  });
});
