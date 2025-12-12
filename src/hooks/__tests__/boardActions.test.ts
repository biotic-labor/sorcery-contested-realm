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

function createSiteCard(id: string, owner: 'player' | 'opponent', thresholds = { air: 1, earth: 0, fire: 0, water: 0 }): CardInstance {
  return {
    ...createMockCard(id, owner),
    cardData: {
      ...createMockCard(id, owner).cardData,
      guardian: {
        ...createMockCard(id, owner).cardData.guardian,
        type: 'Site',
        thresholds,
      },
    },
  };
}

describe('boardActions', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe('placeCardOnSite', () => {
    it('places site card on board', () => {
      const site = createSiteCard('site1', 'player');

      useGameStore.getState().placeCardOnSite(site, { row: 1, col: 2 });

      const boardSite = useGameStore.getState().board[1][2].siteCard;
      expect(boardSite?.id).toBe('site1');
    });

    it('increments player mana when player places site', () => {
      const site = createSiteCard('site1', 'player');
      const initialMana = useGameStore.getState().playerMana;

      useGameStore.getState().placeCardOnSite(site, { row: 1, col: 2 });

      expect(useGameStore.getState().playerMana).toBe(initialMana + 1);
      expect(useGameStore.getState().playerManaTotal).toBe(initialMana + 1);
    });

    it('increments opponent mana when opponent places site', () => {
      const site = createSiteCard('site1', 'opponent');
      const initialMana = useGameStore.getState().opponentMana;

      useGameStore.getState().placeCardOnSite(site, { row: 0, col: 2 });

      expect(useGameStore.getState().opponentMana).toBe(initialMana + 1);
    });

    it('adds site thresholds to player', () => {
      const site = createSiteCard('site1', 'player', { air: 1, earth: 2, fire: 0, water: 0 });

      useGameStore.getState().placeCardOnSite(site, { row: 1, col: 2 });

      const thresholds = useGameStore.getState().playerThresholds;
      expect(thresholds.air).toBe(1);
      expect(thresholds.earth).toBe(2);
    });
  });

  describe('placeUnitOnSite', () => {
    it('places unit on site', () => {
      const unit = createMockCard('unit1', 'player');

      useGameStore.getState().placeUnitOnSite(unit, { row: 1, col: 2 });

      const units = useGameStore.getState().board[1][2].units;
      expect(units).toHaveLength(1);
      expect(units[0].id).toBe('unit1');
    });

    it('stacks multiple units on same site', () => {
      const unit1 = createMockCard('unit1', 'player');
      const unit2 = createMockCard('unit2', 'player');

      useGameStore.getState().placeUnitOnSite(unit1, { row: 1, col: 2 });
      useGameStore.getState().placeUnitOnSite(unit2, { row: 1, col: 2 });

      const units = useGameStore.getState().board[1][2].units;
      expect(units).toHaveLength(2);
    });
  });

  describe('placeUnitOnVertex', () => {
    it('places unit on vertex', () => {
      const unit = createMockCard('unit1', 'player');

      useGameStore.getState().placeUnitOnVertex(unit, 'v-1-2');

      const vertexUnits = useGameStore.getState().vertices['v-1-2'];
      expect(vertexUnits).toHaveLength(1);
      expect(vertexUnits[0].id).toBe('unit1');
    });

    it('creates vertex entry if not exists', () => {
      const unit = createMockCard('unit1', 'player');

      useGameStore.getState().placeUnitOnVertex(unit, 'v-3-3');

      expect(useGameStore.getState().vertices['v-3-3']).toBeDefined();
    });
  });

  describe('removeCardFromVertex', () => {
    it('removes card from vertex', () => {
      const unit = createMockCard('unit1', 'player');
      useGameStore.getState().placeUnitOnVertex(unit, 'v-1-2');

      useGameStore.getState().removeCardFromVertex('unit1', 'v-1-2');

      expect(useGameStore.getState().vertices['v-1-2']).toBeUndefined();
    });

    it('keeps vertex if other cards remain', () => {
      const unit1 = createMockCard('unit1', 'player');
      const unit2 = createMockCard('unit2', 'player');
      useGameStore.getState().placeUnitOnVertex(unit1, 'v-1-2');
      useGameStore.getState().placeUnitOnVertex(unit2, 'v-1-2');

      useGameStore.getState().removeCardFromVertex('unit1', 'v-1-2');

      expect(useGameStore.getState().vertices['v-1-2']).toHaveLength(1);
    });
  });

  describe('moveCard', () => {
    it('moves unit from one site to another', () => {
      const unit = createMockCard('unit1', 'player');
      useGameStore.getState().placeUnitOnSite(unit, { row: 1, col: 1 });

      useGameStore.getState().moveCard('unit1', { row: 1, col: 1 }, { row: 2, col: 2 });

      expect(useGameStore.getState().board[1][1].units).toHaveLength(0);
      expect(useGameStore.getState().board[2][2].units).toHaveLength(1);
      expect(useGameStore.getState().board[2][2].units[0].id).toBe('unit1');
    });

    it('moves site card', () => {
      const site = createSiteCard('site1', 'player');
      useGameStore.getState().placeCardOnSite(site, { row: 0, col: 0 });

      useGameStore.getState().moveCard('site1', { row: 0, col: 0 }, { row: 1, col: 1 });

      expect(useGameStore.getState().board[0][0].siteCard).toBeNull();
      expect(useGameStore.getState().board[1][1].siteCard?.id).toBe('site1');
    });
  });

  describe('removeCardFromBoard', () => {
    it('removes unit from board', () => {
      const unit = createMockCard('unit1', 'player');
      useGameStore.getState().placeUnitOnSite(unit, { row: 1, col: 1 });

      useGameStore.getState().removeCardFromBoard('unit1', { row: 1, col: 1 });

      expect(useGameStore.getState().board[1][1].units).toHaveLength(0);
    });

    it('removes site card from board', () => {
      const site = createSiteCard('site1', 'player');
      useGameStore.getState().placeCardOnSite(site, { row: 1, col: 1 });

      useGameStore.getState().removeCardFromBoard('site1', { row: 1, col: 1 });

      expect(useGameStore.getState().board[1][1].siteCard).toBeNull();
    });

    it('removes card from underCards', () => {
      const site = createSiteCard('site1', 'player');
      const unit = createMockCard('unit1', 'player');
      useGameStore.getState().placeCardOnSite(site, { row: 1, col: 1 });
      useGameStore.getState().placeUnitOnSite(unit, { row: 1, col: 1 });
      useGameStore.getState().toggleCardUnder('unit1');

      useGameStore.getState().removeCardFromBoard('unit1', { row: 1, col: 1 });

      expect(useGameStore.getState().board[1][1].underCards).toHaveLength(0);
    });
  });

  describe('placeAvatar', () => {
    it('places avatar in site units', () => {
      const avatar = createMockCard('avatar1', 'player');

      useGameStore.getState().placeAvatar(avatar, { row: 3, col: 2 });

      const units = useGameStore.getState().board[3][2].units;
      expect(units).toHaveLength(1);
      expect(units[0].id).toBe('avatar1');
    });
  });

  describe('raiseUnit', () => {
    it('raises unit to top of stack', () => {
      const unit1 = createMockCard('unit1', 'player');
      const unit2 = createMockCard('unit2', 'player');
      const unit3 = createMockCard('unit3', 'player');
      useGameStore.getState().placeUnitOnSite(unit1, { row: 1, col: 1 });
      useGameStore.getState().placeUnitOnSite(unit2, { row: 1, col: 1 });
      useGameStore.getState().placeUnitOnSite(unit3, { row: 1, col: 1 });

      useGameStore.getState().raiseUnit('unit1', { row: 1, col: 1 });

      const units = useGameStore.getState().board[1][1].units;
      expect(units[2].id).toBe('unit1');
    });

    it('does nothing if unit already on top', () => {
      const unit1 = createMockCard('unit1', 'player');
      const unit2 = createMockCard('unit2', 'player');
      useGameStore.getState().placeUnitOnSite(unit1, { row: 1, col: 1 });
      useGameStore.getState().placeUnitOnSite(unit2, { row: 1, col: 1 });

      useGameStore.getState().raiseUnit('unit2', { row: 1, col: 1 });

      const units = useGameStore.getState().board[1][1].units;
      expect(units[1].id).toBe('unit2');
    });

    it('does nothing if unit not found', () => {
      const unit1 = createMockCard('unit1', 'player');
      useGameStore.getState().placeUnitOnSite(unit1, { row: 1, col: 1 });

      expect(() => {
        useGameStore.getState().raiseUnit('nonexistent', { row: 1, col: 1 });
      }).not.toThrow();
    });
  });
});
