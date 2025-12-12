import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../useGameState';
import { CardInstance, CardData, CardVariant } from '../../types';

function createMockCard(id: string, owner: 'player' | 'opponent', rotation = 0): CardInstance {
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

  return { id, cardData, variant, rotation, owner };
}

function createSiteCard(id: string, owner: 'player' | 'opponent'): CardInstance {
  return {
    ...createMockCard(id, owner),
    cardData: {
      ...createMockCard(id, owner).cardData,
      guardian: {
        ...createMockCard(id, owner).cardData.guardian,
        type: 'Site',
      },
    },
  };
}

describe('cardStateActions', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe('rotateCard', () => {
    it('rotates untapped card to 90 degrees', () => {
      const card = createMockCard('unit1', 'player', 0);
      useGameStore.getState().placeUnitOnSite(card, { row: 1, col: 1 });

      useGameStore.getState().rotateCard('unit1');

      expect(useGameStore.getState().board[1][1].units[0].rotation).toBe(90);
    });

    it('rotates tapped card to 0 degrees', () => {
      const card = createMockCard('unit1', 'player', 90);
      useGameStore.getState().placeUnitOnSite(card, { row: 1, col: 1 });

      useGameStore.getState().rotateCard('unit1');

      expect(useGameStore.getState().board[1][1].units[0].rotation).toBe(0);
    });

    it('rotates site card', () => {
      const site = createSiteCard('site1', 'player');
      useGameStore.getState().placeCardOnSite(site, { row: 1, col: 1 });

      useGameStore.getState().rotateCard('site1');

      expect(useGameStore.getState().board[1][1].siteCard?.rotation).toBe(90);
    });

    it('rotates card on vertex', () => {
      const card = createMockCard('unit1', 'player', 0);
      useGameStore.getState().placeUnitOnVertex(card, 'v-1-1');

      useGameStore.getState().rotateCard('unit1');

      expect(useGameStore.getState().vertices['v-1-1'][0].rotation).toBe(90);
    });

    it('rotates attachments with host card', () => {
      const host = createMockCard('host', 'player', 0);
      const token = createMockCard('token', 'player', 0);
      host.attachments = [token];
      useGameStore.getState().placeUnitOnSite(host, { row: 1, col: 1 });

      useGameStore.getState().rotateCard('host');

      const unit = useGameStore.getState().board[1][1].units[0];
      expect(unit.rotation).toBe(90);
      expect(unit.attachments?.[0].rotation).toBe(90);
    });
  });

  describe('untapAllCards', () => {
    it('untaps all player cards', () => {
      const card1 = createMockCard('unit1', 'player', 90);
      const card2 = createMockCard('unit2', 'player', 90);
      useGameStore.getState().placeUnitOnSite(card1, { row: 1, col: 1 });
      useGameStore.getState().placeUnitOnSite(card2, { row: 2, col: 2 });

      useGameStore.getState().untapAllCards('player');

      expect(useGameStore.getState().board[1][1].units[0].rotation).toBe(0);
      expect(useGameStore.getState().board[2][2].units[0].rotation).toBe(0);
    });

    it('does not untap opponent cards', () => {
      const playerCard = createMockCard('unit1', 'player', 90);
      const opponentCard = createMockCard('unit2', 'opponent', 90);
      useGameStore.getState().placeUnitOnSite(playerCard, { row: 1, col: 1 });
      useGameStore.getState().placeUnitOnSite(opponentCard, { row: 0, col: 0 });

      useGameStore.getState().untapAllCards('player');

      expect(useGameStore.getState().board[1][1].units[0].rotation).toBe(0);
      expect(useGameStore.getState().board[0][0].units[0].rotation).toBe(90);
    });

    it('untaps cards on vertices', () => {
      const card = createMockCard('unit1', 'player', 90);
      useGameStore.getState().placeUnitOnVertex(card, 'v-1-1');

      useGameStore.getState().untapAllCards('player');

      expect(useGameStore.getState().vertices['v-1-1'][0].rotation).toBe(0);
    });

    it('untaps attachments', () => {
      const host = createMockCard('host', 'player', 90);
      const token = createMockCard('token', 'player', 90);
      host.attachments = [token];
      useGameStore.getState().placeUnitOnSite(host, { row: 1, col: 1 });

      useGameStore.getState().untapAllCards('player');

      const unit = useGameStore.getState().board[1][1].units[0];
      expect(unit.rotation).toBe(0);
      expect(unit.attachments?.[0].rotation).toBe(0);
    });
  });

  describe('flipCard', () => {
    it('flips card face down', () => {
      const card = createMockCard('unit1', 'player');
      useGameStore.getState().placeUnitOnSite(card, { row: 1, col: 1 });

      useGameStore.getState().flipCard('unit1');

      expect(useGameStore.getState().board[1][1].units[0].faceDown).toBe(true);
    });

    it('flips face down card face up', () => {
      const card = { ...createMockCard('unit1', 'player'), faceDown: true };
      useGameStore.getState().placeUnitOnSite(card, { row: 1, col: 1 });

      useGameStore.getState().flipCard('unit1');

      expect(useGameStore.getState().board[1][1].units[0].faceDown).toBe(false);
    });

    it('flips site card', () => {
      const site = createSiteCard('site1', 'player');
      useGameStore.getState().placeCardOnSite(site, { row: 1, col: 1 });

      useGameStore.getState().flipCard('site1');

      expect(useGameStore.getState().board[1][1].siteCard?.faceDown).toBe(true);
    });

    it('flips card on vertex', () => {
      const card = createMockCard('unit1', 'player');
      useGameStore.getState().placeUnitOnVertex(card, 'v-1-1');

      useGameStore.getState().flipCard('unit1');

      expect(useGameStore.getState().vertices['v-1-1'][0].faceDown).toBe(true);
    });
  });

  describe('toggleCardUnder', () => {
    it('moves unit to underCards', () => {
      const site = createSiteCard('site1', 'player');
      const unit = createMockCard('unit1', 'player');
      useGameStore.getState().placeCardOnSite(site, { row: 1, col: 1 });
      useGameStore.getState().placeUnitOnSite(unit, { row: 1, col: 1 });

      useGameStore.getState().toggleCardUnder('unit1');

      expect(useGameStore.getState().board[1][1].units).toHaveLength(0);
      expect(useGameStore.getState().board[1][1].underCards).toHaveLength(1);
      expect(useGameStore.getState().board[1][1].underCards[0].id).toBe('unit1');
    });

    it('moves underCard back to units', () => {
      const site = createSiteCard('site1', 'player');
      const unit = createMockCard('unit1', 'player');
      useGameStore.getState().placeCardOnSite(site, { row: 1, col: 1 });
      useGameStore.getState().placeUnitOnSite(unit, { row: 1, col: 1 });
      useGameStore.getState().toggleCardUnder('unit1');

      useGameStore.getState().toggleCardUnder('unit1');

      expect(useGameStore.getState().board[1][1].underCards).toHaveLength(0);
      expect(useGameStore.getState().board[1][1].units).toHaveLength(1);
    });

    it('does nothing if card not found', () => {
      expect(() => {
        useGameStore.getState().toggleCardUnder('nonexistent');
      }).not.toThrow();
    });
  });
});
