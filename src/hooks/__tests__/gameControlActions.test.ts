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

describe('gameControlActions', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe('startTurn', () => {
    it('untaps all player cards on board', () => {
      const card1 = createMockCard('unit1', 'player', 90);
      const card2 = createMockCard('unit2', 'player', 90);
      useGameStore.getState().placeUnitOnSite(card1, { row: 1, col: 1 });
      useGameStore.getState().placeUnitOnSite(card2, { row: 2, col: 2 });

      useGameStore.getState().startTurn('player');

      expect(useGameStore.getState().board[1][1].units[0].rotation).toBe(0);
      expect(useGameStore.getState().board[2][2].units[0].rotation).toBe(0);
    });

    it('does not untap opponent cards when player starts turn', () => {
      const playerCard = createMockCard('unit1', 'player', 90);
      const opponentCard = createMockCard('unit2', 'opponent', 90);
      useGameStore.getState().placeUnitOnSite(playerCard, { row: 1, col: 1 });
      useGameStore.getState().placeUnitOnSite(opponentCard, { row: 0, col: 0 });

      useGameStore.getState().startTurn('player');

      expect(useGameStore.getState().board[1][1].units[0].rotation).toBe(0);
      expect(useGameStore.getState().board[0][0].units[0].rotation).toBe(90);
    });

    it('untaps site cards', () => {
      const site = { ...createSiteCard('site1', 'player'), rotation: 90 };
      useGameStore.getState().placeCardOnSite(site, { row: 1, col: 1 });

      useGameStore.getState().startTurn('player');

      expect(useGameStore.getState().board[1][1].siteCard?.rotation).toBe(0);
    });

    it('untaps cards on vertices', () => {
      const card = createMockCard('unit1', 'player', 90);
      useGameStore.getState().placeUnitOnVertex(card, 'v-1-1');

      useGameStore.getState().startTurn('player');

      expect(useGameStore.getState().vertices['v-1-1'][0].rotation).toBe(0);
    });

    it('untaps underCards', () => {
      const site = createSiteCard('site1', 'player');
      const unit = createMockCard('unit1', 'player', 90);
      useGameStore.getState().placeCardOnSite(site, { row: 1, col: 1 });
      useGameStore.getState().placeUnitOnSite(unit, { row: 1, col: 1 });
      useGameStore.getState().toggleCardUnder('unit1');

      useGameStore.getState().startTurn('player');

      expect(useGameStore.getState().board[1][1].underCards[0].rotation).toBe(0);
    });

    it('refills player mana to mana total', () => {
      useGameStore.setState({ playerMana: 2, playerManaTotal: 5 });

      useGameStore.getState().startTurn('player');

      expect(useGameStore.getState().playerMana).toBe(5);
    });

    it('refills opponent mana when opponent starts turn', () => {
      useGameStore.setState({ opponentMana: 1, opponentManaTotal: 4 });

      useGameStore.getState().startTurn('opponent');

      expect(useGameStore.getState().opponentMana).toBe(4);
    });

    it('sets turnStarted to true', () => {
      expect(useGameStore.getState().turnStarted).toBe(false);

      useGameStore.getState().startTurn('player');

      expect(useGameStore.getState().turnStarted).toBe(true);
    });

    it('untaps attachments on units', () => {
      const host = createMockCard('host', 'player', 90);
      const token = createMockCard('token', 'player', 90);
      host.attachments = [token];
      useGameStore.getState().placeUnitOnSite(host, { row: 1, col: 1 });

      useGameStore.getState().startTurn('player');

      const unit = useGameStore.getState().board[1][1].units[0];
      expect(unit.rotation).toBe(0);
      expect(unit.attachments?.[0].rotation).toBe(0);
    });
  });

  describe('endTurn', () => {
    it('switches current turn to opponent', () => {
      useGameStore.setState({ currentTurn: 'player' });

      useGameStore.getState().endTurn();

      expect(useGameStore.getState().currentTurn).toBe('opponent');
    });

    it('switches current turn to player', () => {
      useGameStore.setState({ currentTurn: 'opponent' });

      useGameStore.getState().endTurn();

      expect(useGameStore.getState().currentTurn).toBe('player');
    });

    it('increments turn number when opponent ends turn', () => {
      useGameStore.setState({ currentTurn: 'opponent', turnNumber: 3 });

      useGameStore.getState().endTurn();

      expect(useGameStore.getState().turnNumber).toBe(4);
    });

    it('does not increment turn number when player ends turn', () => {
      useGameStore.setState({ currentTurn: 'player', turnNumber: 3 });

      useGameStore.getState().endTurn();

      expect(useGameStore.getState().turnNumber).toBe(3);
    });

    it('sets turnStarted to false', () => {
      useGameStore.setState({ turnStarted: true });

      useGameStore.getState().endTurn();

      expect(useGameStore.getState().turnStarted).toBe(false);
    });
  });

  describe('hoverCard', () => {
    it('sets hovered card', () => {
      const card = createMockCard('c1', 'player');

      useGameStore.getState().hoverCard(card);

      expect(useGameStore.getState().hoveredCard?.id).toBe('c1');
    });

    it('clears hovered card with null', () => {
      const card = createMockCard('c1', 'player');
      useGameStore.getState().hoverCard(card);

      useGameStore.getState().hoverCard(null);

      expect(useGameStore.getState().hoveredCard).toBeNull();
    });
  });

  describe('setHoveredDeck', () => {
    it('sets hovered deck', () => {
      useGameStore.getState().setHoveredDeck({ player: 'player', deckType: 'site' });

      const hoveredDeck = useGameStore.getState().hoveredDeck;
      expect(hoveredDeck?.player).toBe('player');
      expect(hoveredDeck?.deckType).toBe('site');
    });

    it('clears hovered deck with null', () => {
      useGameStore.getState().setHoveredDeck({ player: 'player', deckType: 'site' });

      useGameStore.getState().setHoveredDeck(null);

      expect(useGameStore.getState().hoveredDeck).toBeNull();
    });
  });

  describe('resetGame', () => {
    it('resets all state to initial values', () => {
      const card = createMockCard('unit1', 'player');
      useGameStore.getState().placeUnitOnSite(card, { row: 1, col: 1 });
      useGameStore.setState({
        playerLife: 5,
        opponentLife: 10,
        playerMana: 3,
        turnNumber: 5,
      });

      useGameStore.getState().resetGame();

      expect(useGameStore.getState().playerLife).toBe(20);
      expect(useGameStore.getState().opponentLife).toBe(20);
      expect(useGameStore.getState().playerMana).toBe(0);
      expect(useGameStore.getState().turnNumber).toBe(1);
      expect(useGameStore.getState().board[1][1].units).toHaveLength(0);
    });
  });

  describe('importDeck', () => {
    it('places site cards in site deck', () => {
      const siteCards = [createSiteCard('s1', 'player'), createSiteCard('s2', 'player')];

      useGameStore.getState().importDeck(siteCards, [], null, 'player');

      expect(useGameStore.getState().playerSiteDeck.length).toBe(2);
    });

    it('places spell cards in spell deck', () => {
      const spellCards = [createMockCard('m1', 'player'), createMockCard('m2', 'player')];

      useGameStore.getState().importDeck([], spellCards, null, 'player');

      expect(useGameStore.getState().playerSpellDeck.length).toBe(2);
    });

    it('places avatar on board at player position', () => {
      const avatar = createMockCard('avatar1', 'player');

      useGameStore.getState().importDeck([], [], avatar, 'player');

      expect(useGameStore.getState().board[3][2].units).toHaveLength(1);
      expect(useGameStore.getState().board[3][2].units[0].id).toBe('avatar1');
    });

    it('places avatar on board at opponent position', () => {
      const avatar = createMockCard('avatar1', 'opponent');

      useGameStore.getState().importDeck([], [], avatar, 'opponent');

      expect(useGameStore.getState().board[0][2].units).toHaveLength(1);
      expect(useGameStore.getState().board[0][2].units[0].id).toBe('avatar1');
    });

    it('places collection cards in collection', () => {
      const collectionCards = [createMockCard('c1', 'player')];

      useGameStore.getState().importDeck([], [], null, 'player', collectionCards);

      expect(useGameStore.getState().playerCollection).toHaveLength(1);
    });

    it('imports for opponent', () => {
      const siteCards = [createSiteCard('s1', 'opponent')];
      const spellCards = [createMockCard('m1', 'opponent')];

      useGameStore.getState().importDeck(siteCards, spellCards, null, 'opponent');

      expect(useGameStore.getState().opponentSiteDeck.length).toBe(1);
      expect(useGameStore.getState().opponentSpellDeck.length).toBe(1);
    });
  });

  describe('clearDecks', () => {
    it('clears all player decks and zones', () => {
      useGameStore.setState({
        playerSiteDeck: [createSiteCard('s1', 'player')],
        playerSpellDeck: [createMockCard('m1', 'player')],
        playerHand: [createMockCard('h1', 'player')],
        playerGraveyard: [createMockCard('g1', 'player')],
        playerCollection: [createMockCard('c1', 'player')],
        playerSpellStack: [createMockCard('ss1', 'player')],
      });

      useGameStore.getState().clearDecks('player');

      expect(useGameStore.getState().playerSiteDeck).toHaveLength(0);
      expect(useGameStore.getState().playerSpellDeck).toHaveLength(0);
      expect(useGameStore.getState().playerHand).toHaveLength(0);
      expect(useGameStore.getState().playerGraveyard).toHaveLength(0);
      expect(useGameStore.getState().playerCollection).toHaveLength(0);
      expect(useGameStore.getState().playerSpellStack).toHaveLength(0);
    });

    it('removes player cards from board', () => {
      const site = createSiteCard('site1', 'player');
      const unit = createMockCard('unit1', 'player');
      useGameStore.getState().placeCardOnSite(site, { row: 1, col: 1 });
      useGameStore.getState().placeUnitOnSite(unit, { row: 1, col: 1 });

      useGameStore.getState().clearDecks('player');

      expect(useGameStore.getState().board[1][1].siteCard).toBeNull();
      expect(useGameStore.getState().board[1][1].units).toHaveLength(0);
    });

    it('removes player cards from vertices', () => {
      const card = createMockCard('unit1', 'player');
      useGameStore.getState().placeUnitOnVertex(card, 'v-1-1');

      useGameStore.getState().clearDecks('player');

      expect(useGameStore.getState().vertices['v-1-1']).toBeUndefined();
    });

    it('resets player stats', () => {
      useGameStore.setState({
        playerLife: 5,
        playerMana: 3,
        playerManaTotal: 5,
        playerThresholds: { air: 2, earth: 1, fire: 0, water: 3 },
      });

      useGameStore.getState().clearDecks('player');

      expect(useGameStore.getState().playerLife).toBe(20);
      expect(useGameStore.getState().playerMana).toBe(0);
      expect(useGameStore.getState().playerManaTotal).toBe(0);
      expect(useGameStore.getState().playerThresholds).toEqual({ air: 0, earth: 0, fire: 0, water: 0 });
    });

    it('does not affect opponent when clearing player', () => {
      const opponentUnit = createMockCard('opp1', 'opponent');
      useGameStore.getState().placeUnitOnSite(opponentUnit, { row: 0, col: 0 });
      useGameStore.setState({
        opponentLife: 15,
        opponentHand: [createMockCard('oh1', 'opponent')],
      });

      useGameStore.getState().clearDecks('player');

      expect(useGameStore.getState().board[0][0].units).toHaveLength(1);
      expect(useGameStore.getState().opponentLife).toBe(15);
      expect(useGameStore.getState().opponentHand).toHaveLength(1);
    });

    it('clears opponent decks and zones', () => {
      useGameStore.setState({
        opponentSiteDeck: [createSiteCard('s1', 'opponent')],
        opponentSpellDeck: [createMockCard('m1', 'opponent')],
        opponentHand: [createMockCard('h1', 'opponent')],
      });

      useGameStore.getState().clearDecks('opponent');

      expect(useGameStore.getState().opponentSiteDeck).toHaveLength(0);
      expect(useGameStore.getState().opponentSpellDeck).toHaveLength(0);
      expect(useGameStore.getState().opponentHand).toHaveLength(0);
    });
  });

  describe('setDecks', () => {
    it('sets player site and spell decks', () => {
      const siteCards = [createSiteCard('s1', 'player')];
      const spellCards = [createMockCard('m1', 'player'), createMockCard('m2', 'player')];

      useGameStore.getState().setDecks('player', siteCards, spellCards);

      expect(useGameStore.getState().playerSiteDeck).toHaveLength(1);
      expect(useGameStore.getState().playerSpellDeck).toHaveLength(2);
    });

    it('sets opponent site and spell decks', () => {
      const siteCards = [createSiteCard('s1', 'opponent')];
      const spellCards = [createMockCard('m1', 'opponent')];

      useGameStore.getState().setDecks('opponent', siteCards, spellCards);

      expect(useGameStore.getState().opponentSiteDeck).toHaveLength(1);
      expect(useGameStore.getState().opponentSpellDeck).toHaveLength(1);
    });

    it('replaces existing decks', () => {
      useGameStore.setState({
        playerSiteDeck: [createSiteCard('old1', 'player'), createSiteCard('old2', 'player')],
      });

      useGameStore.getState().setDecks('player', [createSiteCard('new1', 'player')], []);

      expect(useGameStore.getState().playerSiteDeck).toHaveLength(1);
      expect(useGameStore.getState().playerSiteDeck[0].id).toBe('new1');
    });
  });

  describe('applyFullState', () => {
    it('applies synced state to store', () => {
      const syncedState = {
        board: useGameStore.getState().board,
        vertices: {},
        playerHand: [createMockCard('h1', 'player')],
        opponentHand: [createMockCard('oh1', 'opponent')],
        playerSiteDeck: [createSiteCard('s1', 'player')],
        playerSpellDeck: [],
        opponentSiteDeck: [],
        opponentSpellDeck: [],
        playerGraveyard: [],
        opponentGraveyard: [],
        playerSpellStack: [],
        opponentSpellStack: [],
        playerLife: 15,
        opponentLife: 18,
        playerMana: 3,
        playerManaTotal: 5,
        opponentMana: 2,
        opponentManaTotal: 4,
        playerThresholds: { air: 1, earth: 2, fire: 0, water: 0 },
        opponentThresholds: { air: 0, earth: 0, fire: 1, water: 1 },
        currentTurn: 'opponent' as const,
        turnNumber: 5,
      };

      useGameStore.getState().applyFullState(syncedState);

      expect(useGameStore.getState().playerHand).toHaveLength(1);
      expect(useGameStore.getState().opponentHand).toHaveLength(1);
      expect(useGameStore.getState().playerLife).toBe(15);
      expect(useGameStore.getState().opponentLife).toBe(18);
      expect(useGameStore.getState().currentTurn).toBe('opponent');
      expect(useGameStore.getState().turnNumber).toBe(5);
      expect(useGameStore.getState().playerThresholds.air).toBe(1);
    });

    it('resets hover states', () => {
      const card = createMockCard('c1', 'player');
      useGameStore.getState().hoverCard(card);
      useGameStore.getState().setHoveredDeck({ player: 'player', deckType: 'site' });

      const syncedState = {
        board: useGameStore.getState().board,
        vertices: {},
        playerHand: [],
        opponentHand: [],
        playerSiteDeck: [],
        playerSpellDeck: [],
        opponentSiteDeck: [],
        opponentSpellDeck: [],
        playerGraveyard: [],
        opponentGraveyard: [],
        playerSpellStack: [],
        opponentSpellStack: [],
        playerLife: 20,
        opponentLife: 20,
        playerMana: 0,
        playerManaTotal: 0,
        opponentMana: 0,
        opponentManaTotal: 0,
        playerThresholds: { air: 0, earth: 0, fire: 0, water: 0 },
        opponentThresholds: { air: 0, earth: 0, fire: 0, water: 0 },
        currentTurn: 'player' as const,
        turnNumber: 1,
      };

      useGameStore.getState().applyFullState(syncedState);

      expect(useGameStore.getState().hoveredCard).toBeNull();
      expect(useGameStore.getState().hoveredDeck).toBeNull();
    });
  });
});
