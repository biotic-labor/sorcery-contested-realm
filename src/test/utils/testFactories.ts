import type {
  CardInstance,
  CardData,
  CardVariant,
  CardType,
  Thresholds,
  Rarity,
} from '../../types/card';
import type { BoardSite } from '../../types/game';
import { createEmptyBoard } from '../../types/game';

let idCounter = 0;

// Reset counter for test isolation
export function resetIdCounter(): void {
  idCounter = 0;
}

export function createTestCard(
  owner: 'player' | 'opponent',
  overrides: Partial<{
    id: string;
    name: string;
    type: CardType;
    rotation: number;
    thresholds: Thresholds;
    cost: number | null;
    attack: number | null;
    defence: number | null;
    life: number | null;
    rarity: Rarity;
    sourceDeck: 'site' | 'spell';
  }> = {}
): CardInstance {
  idCounter++;
  const id = overrides.id ?? `${owner}-card-${idCounter}`;
  const type = overrides.type ?? 'Minion';

  const cardData: CardData = {
    name: overrides.name ?? `Test ${type} ${idCounter}`,
    guardian: {
      rarity: overrides.rarity ?? 'Ordinary',
      type,
      rulesText: '',
      cost: overrides.cost ?? (type === 'Site' ? null : 2),
      attack: overrides.attack ?? (type === 'Minion' ? 2 : null),
      defence: overrides.defence ?? (type === 'Minion' ? 2 : null),
      life: overrides.life ?? (type === 'Avatar' ? 20 : null),
      thresholds: overrides.thresholds ?? { air: 0, earth: 0, fire: 0, water: 0 },
    },
    elements: '',
    subTypes: '',
    sets: [],
  };

  const variant: CardVariant = {
    slug: `test-slug-${idCounter}`,
    finish: 'Standard',
    product: 'Test',
    artist: '',
    flavorText: '',
    typeText: '',
  };

  const card: CardInstance = {
    id,
    cardData,
    variant,
    rotation: overrides.rotation ?? 0,
    owner,
  };

  if (overrides.sourceDeck) {
    card.sourceDeck = overrides.sourceDeck;
  }

  return card;
}

export function createTestSiteCard(
  owner: 'player' | 'opponent',
  overrides: Partial<{
    id: string;
    name: string;
    thresholds: Thresholds;
    rarity: Rarity;
  }> = {}
): CardInstance {
  return createTestCard(owner, {
    type: 'Site',
    thresholds: overrides.thresholds ?? { air: 1, earth: 0, fire: 0, water: 0 },
    ...overrides,
  });
}

export function createTestAvatarCard(
  owner: 'player' | 'opponent',
  overrides: Partial<{
    id: string;
    name: string;
    life: number;
    rotation: number;
  }> = {}
): CardInstance {
  return createTestCard(owner, {
    type: 'Avatar',
    life: overrides.life ?? 20,
    ...overrides,
  });
}

export function createTestBoardWithCards(
  cards: Array<{
    card: CardInstance;
    row: number;
    col: number;
    asSiteCard?: boolean;
    asUnderCard?: boolean;
  }>
): BoardSite[][] {
  const board = createEmptyBoard();

  for (const { card, row, col, asSiteCard, asUnderCard } of cards) {
    if (asSiteCard) {
      board[row][col].siteCard = card;
    } else if (asUnderCard) {
      board[row][col].underCards.push(card);
    } else {
      board[row][col].units.push(card);
    }
  }

  return board;
}

export function createEmptyThresholds(): Thresholds {
  return { air: 0, earth: 0, fire: 0, water: 0 };
}

export function createMockCuriosaDeckResponse() {
  return {
    id: 'test-deck-id',
    name: 'Test Deck',
    avatar: {
      card: {
        name: 'Test Avatar',
        category: 'Avatar',
        type: 'Avatar',
        rarity: null,
        cost: null,
        attack: 1,
        defense: 1,
        life: 20,
        rulesText: '',
        elements: [],
        airThreshold: 0,
        earthThreshold: 0,
        fireThreshold: 0,
        waterThreshold: 0,
      },
      variant: {
        slug: 'test-avatar',
        finish: 'Standard',
        product: 'Test',
        artist: { name: '' },
        flavorText: '',
        typeText: '',
      },
      quantity: 1,
    },
    decklist: [
      {
        card: {
          name: 'Test Site',
          category: 'Site',
          type: 'Site',
          rarity: 'Ordinary',
          cost: null,
          attack: null,
          defense: null,
          life: null,
          rulesText: '',
          elements: [{ name: 'Air' }],
          airThreshold: 1,
          earthThreshold: 0,
          fireThreshold: 0,
          waterThreshold: 0,
        },
        variant: {
          slug: 'test-site',
          finish: 'Standard',
          product: 'Test',
          artist: { name: '' },
          flavorText: '',
          typeText: '',
        },
        quantity: 10,
      },
      {
        card: {
          name: 'Test Minion',
          category: 'Spell',
          type: 'Minion',
          rarity: 'Ordinary',
          cost: 2,
          attack: 2,
          defense: 2,
          life: null,
          rulesText: '',
          elements: [{ name: 'Air' }],
          airThreshold: 1,
          earthThreshold: 0,
          fireThreshold: 0,
          waterThreshold: 0,
        },
        variant: {
          slug: 'test-minion',
          finish: 'Standard',
          product: 'Test',
          artist: { name: '' },
          flavorText: '',
          typeText: '',
        },
        quantity: 3,
      },
    ],
  };
}
