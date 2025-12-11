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
  counters?: number; // Counter tokens on this card
  faceDown?: boolean; // Whether the card is flipped face-down
  isToken?: boolean; // Token cards render at smaller size (except Site tokens and full-size tokens)
  isFullSizeToken?: boolean; // Full-size tokens like Bruin, Tawny
  isAttachable?: boolean; // Token can be attached to other cards
  attachments?: CardInstance[]; // Tokens attached to this card
}

// CDN base URL for all card assets
const CDN_BASE_URL = 'https://cdn.play-sorcery.com';

// Helper to get card image URL from slug
export function getCardImageUrl(slug: string): string {
  return `${CDN_BASE_URL}/card-fronts/${slug}.png`;
}

// Helper to get card back image URL
export function getCardBackUrl(type: 'site' | 'spell'): string {
  const filename = type === 'site' ? 'cardback-atlas.png' : 'cardback-spellbook.png';
  return `${CDN_BASE_URL}/card-backs/${filename}`;
}

// Helper to get playmat image URL
export function getPlaymatUrl(name: string): string {
  return `${CDN_BASE_URL}/playmats/${name}`;
}
