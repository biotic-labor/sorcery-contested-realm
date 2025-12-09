export type CardType = 'Site' | 'Minion' | 'Magic' | 'Aura' | 'Artifact' | 'Avatar';
export type Rarity = 'Ordinary' | 'Elite' | 'Exceptional' | 'Unique' | null;
export type Element = 'Air' | 'Earth' | 'Fire' | 'Water' | 'None';
export type Finish = 'Standard' | 'Foil' | 'Rainbow';

export interface Thresholds {
  air: number;
  earth: number;
  fire: number;
  water: number;
}

export interface CardStats {
  rarity: Rarity;
  type: CardType;
  rulesText: string;
  cost: number | null;
  attack: number | null;
  defence: number | null;
  life: number | null;
  thresholds: Thresholds;
}

export interface CardVariant {
  slug: string;
  finish: Finish;
  product: string;
  artist: string;
  flavorText: string;
  typeText: string;
}

export interface CardSet {
  name: string;
  releasedAt: string;
  metadata: CardStats;
  variants: CardVariant[];
}

export interface CardData {
  name: string;
  guardian: CardStats;
  elements: string;
  subTypes: string;
  sets: CardSet[];
}

// Runtime card instance with unique ID and state
export interface CardInstance {
  id: string;
  cardData: CardData;
  variant: CardVariant;
  rotation: number; // 0 or 90 degrees
  owner: 'player' | 'opponent';
  sourceDeck?: 'site' | 'spell'; // Which deck the card was drawn from (for hidden card backs)
}

// Helper to get image URL from slug
export function getCardImageUrl(slug: string): string {
  // For now, use local assets. In production, this would point to S3/CDN
  return `/assets/cards/${slug}.png`;
}
