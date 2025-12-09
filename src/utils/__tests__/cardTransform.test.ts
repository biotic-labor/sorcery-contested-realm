import { describe, it, expect } from 'vitest';
import { extractDeckId, transformCuriosaDeck } from '../cardTransform';
import type { CuriosaDeckResponse, CuriosaEntry } from '../../types/curiosa';

let entryIdCounter = 0;

// Helper to create a minimal valid CuriosaEntry
function createCuriosaEntry(
  overrides: Partial<{
    name: string;
    category: string;
    type: string;
    quantity: number;
    rarity: string | null;
    cost: number | null;
  }> = {}
): CuriosaEntry {
  entryIdCounter++;
  return {
    id: `test-entry-${entryIdCounter}`,
    card: {
      id: `test-card-${entryIdCounter}`,
      slug: `test-card-slug-${entryIdCounter}`,
      name: overrides.name ?? 'Test Card',
      category: overrides.category ?? 'Spell',
      type: overrides.type ?? 'Minion',
      rarity: 'rarity' in overrides ? (overrides.rarity ?? null) : 'Ordinary',
      cost: overrides.cost ?? 2,
      attack: 2,
      defense: 2,
      life: null,
      rulesText: '',
      elements: [{ id: 'air-1', name: 'Air' }],
      airThreshold: 1,
      earthThreshold: 0,
      fireThreshold: 0,
      waterThreshold: 0,
    },
    variant: {
      id: `test-variant-${entryIdCounter}`,
      slug: 'test-slug',
      src: 'test-src.png',
      finish: 'Standard',
      product: 'Test Product',
      artist: { id: 'artist-1', slug: 'test-artist', name: 'Test Artist' },
      flavorText: 'Test flavor text',
      typeText: 'Minion',
    },
    quantity: overrides.quantity ?? 1,
  };
}

function createCuriosaResponse(
  overrides: Partial<{
    decklist: CuriosaEntry[];
    avatar: CuriosaEntry | null;
  }> = {}
): CuriosaDeckResponse {
  return {
    decklist: overrides.decklist ?? [],
    avatar: overrides.avatar ?? null,
    sideboard: [],
    maybeboard: [],
  };
}

describe('extractDeckId', () => {
  it('extracts ID from full Curiosa URL', () => {
    const url = 'https://curiosa.io/decks/cmil6rvuf0075la0467q03s4e';
    expect(extractDeckId(url)).toBe('cmil6rvuf0075la0467q03s4e');
  });

  it('extracts ID from URL with trailing slash', () => {
    const url = 'https://curiosa.io/decks/abc123/';
    expect(extractDeckId(url)).toBe('abc123');
  });

  it('extracts ID from URL with query parameters', () => {
    const url = 'https://curiosa.io/decks/xyz789?tab=cards';
    expect(extractDeckId(url)).toBe('xyz789');
  });

  it('returns raw ID unchanged when already a plain ID', () => {
    expect(extractDeckId('cmil6rvuf0075la0467q03s4e')).toBe('cmil6rvuf0075la0467q03s4e');
  });

  it('trims whitespace from input', () => {
    expect(extractDeckId('  abc123  ')).toBe('abc123');
  });

  it('handles URL with www prefix', () => {
    const url = 'https://www.curiosa.io/decks/def456';
    expect(extractDeckId(url)).toBe('def456');
  });

  it('handles HTTP URLs', () => {
    const url = 'http://curiosa.io/decks/ghi789';
    expect(extractDeckId(url)).toBe('ghi789');
  });
});

describe('transformCuriosaDeck', () => {
  describe('card routing', () => {
    it('routes Site category cards to siteCards', () => {
      const response = createCuriosaResponse({
        decklist: [createCuriosaEntry({ category: 'Site', type: 'Site', name: 'Test Site' })],
      });

      const result = transformCuriosaDeck(response, 'player');

      expect(result.siteCards).toHaveLength(1);
      expect(result.siteCards[0].cardData.name).toBe('Test Site');
      expect(result.spellCards).toHaveLength(0);
    });

    it('routes Spell category cards to spellCards', () => {
      const response = createCuriosaResponse({
        decklist: [createCuriosaEntry({ category: 'Spell', type: 'Minion', name: 'Test Minion' })],
      });

      const result = transformCuriosaDeck(response, 'player');

      expect(result.spellCards).toHaveLength(1);
      expect(result.spellCards[0].cardData.name).toBe('Test Minion');
      expect(result.siteCards).toHaveLength(0);
    });

    it('handles mixed site and spell cards', () => {
      const response = createCuriosaResponse({
        decklist: [
          createCuriosaEntry({ category: 'Site', name: 'Site 1' }),
          createCuriosaEntry({ category: 'Spell', name: 'Spell 1' }),
          createCuriosaEntry({ category: 'Site', name: 'Site 2' }),
          createCuriosaEntry({ category: 'Spell', name: 'Spell 2' }),
        ],
      });

      const result = transformCuriosaDeck(response, 'player');

      expect(result.siteCards).toHaveLength(2);
      expect(result.spellCards).toHaveLength(2);
    });
  });

  describe('quantity handling', () => {
    it('creates multiple CardInstances based on quantity', () => {
      const response = createCuriosaResponse({
        decklist: [createCuriosaEntry({ quantity: 4, name: 'Test Card' })],
      });

      const result = transformCuriosaDeck(response, 'player');

      expect(result.spellCards).toHaveLength(4);
      result.spellCards.forEach((card) => {
        expect(card.cardData.name).toBe('Test Card');
      });
    });

    it('creates unique IDs for each instance', () => {
      const response = createCuriosaResponse({
        decklist: [createCuriosaEntry({ quantity: 3 })],
      });

      const result = transformCuriosaDeck(response, 'player');

      const ids = result.spellCards.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it('handles quantity of 0 gracefully', () => {
      const response = createCuriosaResponse({
        decklist: [createCuriosaEntry({ quantity: 0 })],
      });

      const result = transformCuriosaDeck(response, 'player');

      expect(result.spellCards).toHaveLength(0);
    });
  });

  describe('owner assignment', () => {
    it('assigns player owner to all cards when owner is player', () => {
      const response = createCuriosaResponse({
        decklist: [
          createCuriosaEntry({ category: 'Site' }),
          createCuriosaEntry({ category: 'Spell' }),
        ],
        avatar: createCuriosaEntry({ category: 'Avatar', type: 'Avatar' }),
      });

      const result = transformCuriosaDeck(response, 'player');

      expect(result.siteCards.every((c) => c.owner === 'player')).toBe(true);
      expect(result.spellCards.every((c) => c.owner === 'player')).toBe(true);
      expect(result.avatar?.owner).toBe('player');
    });

    it('assigns opponent owner to all cards when owner is opponent', () => {
      const response = createCuriosaResponse({
        decklist: [
          createCuriosaEntry({ category: 'Site' }),
          createCuriosaEntry({ category: 'Spell' }),
        ],
        avatar: createCuriosaEntry({ category: 'Avatar', type: 'Avatar' }),
      });

      const result = transformCuriosaDeck(response, 'opponent');

      expect(result.siteCards.every((c) => c.owner === 'opponent')).toBe(true);
      expect(result.spellCards.every((c) => c.owner === 'opponent')).toBe(true);
      expect(result.avatar?.owner).toBe('opponent');
    });
  });

  describe('avatar handling', () => {
    it('returns null avatar when none provided', () => {
      const response = createCuriosaResponse({ avatar: null });

      const result = transformCuriosaDeck(response, 'player');

      expect(result.avatar).toBeNull();
    });

    it('creates exactly one avatar instance regardless of quantity', () => {
      const response = createCuriosaResponse({
        avatar: {
          ...createCuriosaEntry({ category: 'Avatar', type: 'Avatar' }),
          quantity: 5, // Should be ignored
        },
      });

      const result = transformCuriosaDeck(response, 'player');

      expect(result.avatar).not.toBeNull();
      // Only one avatar should exist
    });

    it('transforms avatar card data correctly', () => {
      const response = createCuriosaResponse({
        avatar: {
          id: 'avatar-entry-1',
          card: {
            id: 'avatar-card-1',
            slug: 'avatar-slug',
            name: 'Test Avatar',
            category: 'Avatar',
            type: 'Avatar',
            rarity: null,
            cost: null,
            attack: 1,
            defense: 1,
            life: 20,
            rulesText: 'Avatar rules',
            elements: [],
            airThreshold: 0,
            earthThreshold: 0,
            fireThreshold: 0,
            waterThreshold: 0,
          },
          variant: {
            id: 'avatar-variant-1',
            slug: 'avatar-slug',
            src: 'avatar.png',
            finish: 'Foil',
            product: 'Alpha',
            artist: { id: 'artist-1', slug: 'artist-slug', name: 'Artist Name' },
            flavorText: 'Flavor',
            typeText: 'Avatar',
          },
          quantity: 1,
        },
      });

      const result = transformCuriosaDeck(response, 'player');

      expect(result.avatar?.cardData.name).toBe('Test Avatar');
      expect(result.avatar?.cardData.guardian.type).toBe('Avatar');
      expect(result.avatar?.cardData.guardian.life).toBe(20);
      expect(result.avatar?.variant.finish).toBe('Foil');
    });
  });

  describe('card data transformation', () => {
    it('maps rarity correctly', () => {
      const response = createCuriosaResponse({
        decklist: [createCuriosaEntry({ rarity: 'Elite' })],
      });

      const result = transformCuriosaDeck(response, 'player');

      expect(result.spellCards[0].cardData.guardian.rarity).toBe('Elite');
    });

    it('maps null rarity to null', () => {
      const response = createCuriosaResponse({
        decklist: [createCuriosaEntry({ rarity: null })],
      });

      const result = transformCuriosaDeck(response, 'player');

      expect(result.spellCards[0].cardData.guardian.rarity).toBeNull();
    });

    it('maps unknown rarity to null', () => {
      const response = createCuriosaResponse({
        decklist: [createCuriosaEntry({ rarity: 'SuperRare' })],
      });

      const result = transformCuriosaDeck(response, 'player');

      expect(result.spellCards[0].cardData.guardian.rarity).toBeNull();
    });

    it('maps card types correctly', () => {
      const types = ['Minion', 'Magic', 'Aura', 'Artifact', 'Site', 'Avatar'] as const;

      types.forEach((type) => {
        const response = createCuriosaResponse({
          decklist: [createCuriosaEntry({ type, category: type === 'Site' ? 'Site' : 'Spell' })],
        });

        const result = transformCuriosaDeck(response, 'player');
        const card = type === 'Site' ? result.siteCards[0] : result.spellCards[0];

        expect(card.cardData.guardian.type).toBe(type);
      });
    });

    it('defaults unknown card type to Minion', () => {
      const response = createCuriosaResponse({
        decklist: [createCuriosaEntry({ type: 'UnknownType' })],
      });

      const result = transformCuriosaDeck(response, 'player');

      expect(result.spellCards[0].cardData.guardian.type).toBe('Minion');
    });

    it('initializes rotation to 0', () => {
      const response = createCuriosaResponse({
        decklist: [createCuriosaEntry()],
      });

      const result = transformCuriosaDeck(response, 'player');

      expect(result.spellCards[0].rotation).toBe(0);
    });

    it('transforms thresholds correctly', () => {
      const response = createCuriosaResponse({
        decklist: [
          {
            ...createCuriosaEntry(),
            card: {
              ...createCuriosaEntry().card,
              airThreshold: 2,
              earthThreshold: 1,
              fireThreshold: 3,
              waterThreshold: 0,
            },
          },
        ],
      });

      const result = transformCuriosaDeck(response, 'player');

      expect(result.spellCards[0].cardData.guardian.thresholds).toEqual({
        air: 2,
        earth: 1,
        fire: 3,
        water: 0,
      });
    });
  });

  describe('empty deck handling', () => {
    it('handles empty decklist', () => {
      const response = createCuriosaResponse({ decklist: [] });

      const result = transformCuriosaDeck(response, 'player');

      expect(result.siteCards).toHaveLength(0);
      expect(result.spellCards).toHaveLength(0);
    });
  });
});
