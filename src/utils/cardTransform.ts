import type {
  CuriosaEntry,
  CuriosaDeckResponse,
} from '../types/curiosa';
import type {
  CardInstance,
  CardData,
  CardVariant,
  CardType,
  Rarity,
  Finish,
} from '../types/card';

let cardIdCounter = 1000; // Start at 1000 to avoid collision with existing mock cards

function generateCardId(): string {
  return `card-${++cardIdCounter}`;
}

function mapRarity(rarity: string | null): Rarity {
  if (!rarity) return null;
  const validRarities: Rarity[] = ['Ordinary', 'Elite', 'Exceptional', 'Unique'];
  return validRarities.includes(rarity as Rarity) ? (rarity as Rarity) : null;
}

function mapCardType(type: string): CardType {
  const validTypes: CardType[] = ['Site', 'Minion', 'Magic', 'Aura', 'Artifact', 'Avatar'];
  return validTypes.includes(type as CardType) ? (type as CardType) : 'Minion';
}

function mapFinish(finish: string): Finish {
  const validFinishes: Finish[] = ['Standard', 'Foil', 'Rainbow'];
  return validFinishes.includes(finish as Finish) ? (finish as Finish) : 'Standard';
}

function transformCuriosaEntry(
  entry: CuriosaEntry,
  owner: 'player' | 'opponent'
): CardInstance[] {
  const { card, variant, quantity } = entry;

  const cardData: CardData = {
    name: card.name,
    guardian: {
      rarity: mapRarity(card.rarity),
      type: mapCardType(card.type),
      rulesText: card.rulesText || '',
      cost: card.cost,
      attack: card.attack,
      defence: card.defense, // Note: Curiosa uses "defense", we use "defence"
      life: card.life,
      thresholds: {
        air: card.airThreshold || 0,
        earth: card.earthThreshold || 0,
        fire: card.fireThreshold || 0,
        water: card.waterThreshold || 0,
      },
    },
    elements: card.elements?.map((e) => e.name).join(', ') || '',
    subTypes: '', // Curiosa doesn't seem to provide this in the standard format
    sets: [], // We don't need sets for gameplay
  };

  const cardVariant: CardVariant = {
    slug: variant.slug,
    finish: mapFinish(variant.finish),
    product: variant.product || '',
    artist: variant.artist?.name || '',
    flavorText: variant.flavorText || '',
    typeText: variant.typeText || '',
  };

  // Create N CardInstance objects based on quantity
  const instances: CardInstance[] = [];
  for (let i = 0; i < quantity; i++) {
    instances.push({
      id: generateCardId(),
      cardData,
      variant: cardVariant,
      rotation: 0,
      owner,
    });
  }

  return instances;
}

export interface TransformedDeck {
  siteCards: CardInstance[];
  spellCards: CardInstance[];
  avatar: CardInstance | null;
}

export function transformCuriosaDeck(
  response: CuriosaDeckResponse,
  owner: 'player' | 'opponent'
): TransformedDeck {
  const siteCards: CardInstance[] = [];
  const spellCards: CardInstance[] = [];
  let avatar: CardInstance | null = null;

  // Process decklist
  for (const entry of response.decklist) {
    const instances = transformCuriosaEntry(entry, owner);

    // Route cards to appropriate deck based on category
    if (entry.card.category === 'Site') {
      siteCards.push(...instances);
    } else {
      // Spells (Minion, Magic, Aura, Artifact)
      spellCards.push(...instances);
    }
  }

  // Process avatar - only create one instance regardless of quantity
  if (response.avatar) {
    const avatarInstances = transformCuriosaEntry(
      { ...response.avatar, quantity: 1 },
      owner
    );
    avatar = avatarInstances[0] || null;
  }

  return {
    siteCards,
    spellCards,
    avatar,
  };
}

// Extract deck ID from a Curiosa URL or return the ID as-is
export function extractDeckId(input: string): string {
  // Handle full URLs like https://curiosa.io/decks/cmil6rvuf0075la0467q03s4e
  const urlMatch = input.match(/curiosa\.io\/decks\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Return as-is if it looks like a deck ID
  return input.trim();
}
