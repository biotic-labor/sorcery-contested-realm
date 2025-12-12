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

describe('tokenActions', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe('attachToken', () => {
    it('attaches token from spell stack to unit', () => {
      const unit = createMockCard('unit1', 'player');
      const token = createMockCard('token1', 'player');
      useGameStore.getState().placeUnitOnSite(unit, { row: 1, col: 1 });
      useGameStore.setState({ playerSpellStack: [token] });

      useGameStore.getState().attachToken('token1', 'unit1');

      expect(useGameStore.getState().playerSpellStack).toHaveLength(0);
      const boardUnit = useGameStore.getState().board[1][1].units[0];
      expect(boardUnit.attachments).toHaveLength(1);
      expect(boardUnit.attachments?.[0].id).toBe('token1');
    });

    it('attaches token from opponent spell stack', () => {
      const unit = createMockCard('unit1', 'player');
      const token = createMockCard('token1', 'opponent');
      useGameStore.getState().placeUnitOnSite(unit, { row: 1, col: 1 });
      useGameStore.setState({ opponentSpellStack: [token] });

      useGameStore.getState().attachToken('token1', 'unit1');

      expect(useGameStore.getState().opponentSpellStack).toHaveLength(0);
      const boardUnit = useGameStore.getState().board[1][1].units[0];
      expect(boardUnit.attachments).toHaveLength(1);
    });

    it('attaches token from hand', () => {
      const unit = createMockCard('unit1', 'player');
      const token = createMockCard('token1', 'player');
      useGameStore.getState().placeUnitOnSite(unit, { row: 1, col: 1 });
      useGameStore.setState({ playerHand: [token] });

      useGameStore.getState().attachToken('token1', 'unit1');

      expect(useGameStore.getState().playerHand).toHaveLength(0);
      const boardUnit = useGameStore.getState().board[1][1].units[0];
      expect(boardUnit.attachments).toHaveLength(1);
    });

    it('attaches token from board to another card', () => {
      const unit1 = createMockCard('unit1', 'player');
      const unit2 = createMockCard('unit2', 'player');
      useGameStore.getState().placeUnitOnSite(unit1, { row: 1, col: 1 });
      useGameStore.getState().placeUnitOnSite(unit2, { row: 2, col: 2 });

      useGameStore.getState().attachToken('unit2', 'unit1');

      expect(useGameStore.getState().board[2][2].units).toHaveLength(0);
      const hostUnit = useGameStore.getState().board[1][1].units[0];
      expect(hostUnit.attachments).toHaveLength(1);
      expect(hostUnit.attachments?.[0].id).toBe('unit2');
    });

    it('moves token from one host to another', () => {
      const unit1 = createMockCard('unit1', 'player');
      const unit2 = createMockCard('unit2', 'player');
      const token = createMockCard('token1', 'player');
      unit1.attachments = [token];
      useGameStore.getState().placeUnitOnSite(unit1, { row: 1, col: 1 });
      useGameStore.getState().placeUnitOnSite(unit2, { row: 2, col: 2 });

      useGameStore.getState().attachToken('token1', 'unit2');

      const oldHost = useGameStore.getState().board[1][1].units[0];
      const newHost = useGameStore.getState().board[2][2].units[0];
      expect(oldHost.attachments).toBeUndefined();
      expect(newHost.attachments).toHaveLength(1);
      expect(newHost.attachments?.[0].id).toBe('token1');
    });

    it('adds to existing attachments', () => {
      const unit = createMockCard('unit1', 'player');
      const existingToken = createMockCard('existing', 'player');
      const newToken = createMockCard('new', 'player');
      unit.attachments = [existingToken];
      useGameStore.getState().placeUnitOnSite(unit, { row: 1, col: 1 });
      useGameStore.setState({ playerSpellStack: [newToken] });

      useGameStore.getState().attachToken('new', 'unit1');

      const boardUnit = useGameStore.getState().board[1][1].units[0];
      expect(boardUnit.attachments).toHaveLength(2);
    });
  });

  describe('detachToken', () => {
    it('detaches token and moves to spell stack', () => {
      const unit = createMockCard('unit1', 'player');
      const token = createMockCard('token1', 'player');
      unit.attachments = [token];
      useGameStore.getState().placeUnitOnSite(unit, { row: 1, col: 1 });

      useGameStore.getState().detachToken('token1', 'unit1', 'player');

      const boardUnit = useGameStore.getState().board[1][1].units[0];
      expect(boardUnit.attachments).toBeUndefined();
      expect(useGameStore.getState().playerSpellStack).toHaveLength(1);
      expect(useGameStore.getState().playerSpellStack[0].id).toBe('token1');
    });

    it('detaches to opponent spell stack', () => {
      const unit = createMockCard('unit1', 'opponent');
      const token = createMockCard('token1', 'opponent');
      unit.attachments = [token];
      useGameStore.getState().placeUnitOnSite(unit, { row: 0, col: 0 });

      useGameStore.getState().detachToken('token1', 'unit1', 'opponent');

      expect(useGameStore.getState().opponentSpellStack).toHaveLength(1);
    });

    it('keeps other attachments when detaching one', () => {
      const unit = createMockCard('unit1', 'player');
      const token1 = createMockCard('token1', 'player');
      const token2 = createMockCard('token2', 'player');
      unit.attachments = [token1, token2];
      useGameStore.getState().placeUnitOnSite(unit, { row: 1, col: 1 });

      useGameStore.getState().detachToken('token1', 'unit1', 'player');

      const boardUnit = useGameStore.getState().board[1][1].units[0];
      expect(boardUnit.attachments).toHaveLength(1);
      expect(boardUnit.attachments?.[0].id).toBe('token2');
    });

    it('detaches from vertex card', () => {
      const unit = createMockCard('unit1', 'player');
      const token = createMockCard('token1', 'player');
      unit.attachments = [token];
      useGameStore.getState().placeUnitOnVertex(unit, 'v-1-1');

      useGameStore.getState().detachToken('token1', 'unit1', 'player');

      const vertexUnit = useGameStore.getState().vertices['v-1-1'][0];
      expect(vertexUnit.attachments).toBeUndefined();
      expect(useGameStore.getState().playerSpellStack).toHaveLength(1);
    });
  });

  describe('removeFromAttachments', () => {
    it('removes attachment without placing it anywhere', () => {
      const unit = createMockCard('unit1', 'player');
      const token = createMockCard('token1', 'player');
      unit.attachments = [token];
      useGameStore.getState().placeUnitOnSite(unit, { row: 1, col: 1 });

      useGameStore.getState().removeFromAttachments('token1', 'unit1');

      const boardUnit = useGameStore.getState().board[1][1].units[0];
      expect(boardUnit.attachments).toBeUndefined();
      expect(useGameStore.getState().playerSpellStack).toHaveLength(0);
    });

    it('removes from underCards host', () => {
      const site = {
        ...createMockCard('site1', 'player'),
        cardData: {
          ...createMockCard('site1', 'player').cardData,
          guardian: { ...createMockCard('site1', 'player').cardData.guardian, type: 'Site' as const },
        },
      };
      const unit = createMockCard('unit1', 'player');
      const token = createMockCard('token1', 'player');
      unit.attachments = [token];
      useGameStore.getState().placeCardOnSite(site, { row: 1, col: 1 });
      useGameStore.getState().placeUnitOnSite(unit, { row: 1, col: 1 });
      useGameStore.getState().toggleCardUnder('unit1');

      useGameStore.getState().removeFromAttachments('token1', 'unit1');

      const underCard = useGameStore.getState().board[1][1].underCards[0];
      expect(underCard.attachments).toBeUndefined();
    });
  });
});
