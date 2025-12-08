// Types for Curiosa.io API responses

export interface CuriosaCardVariant {
  id: string;
  slug: string;
  src: string;
  finish: string;
  product: string;
  typeText: string;
  flavorText: string;
  artist?: {
    id: string;
    slug: string;
    name: string;
  };
}

export interface CuriosaCard {
  id: string;
  slug: string;
  name: string;
  type: string;
  category: string;
  rarity: string | null;
  rulesText: string;
  cost: number | null;
  attack: number | null;
  defense: number | null;
  life: number | null;
  airThreshold: number;
  earthThreshold: number;
  fireThreshold: number;
  waterThreshold: number;
  elements?: Array<{ id: string; name: string }>;
}

export interface CuriosaEntry {
  id: string;
  quantity: number;
  card: CuriosaCard;
  variant: CuriosaCardVariant;
}

export interface CuriosaDeckResponse {
  decklist: CuriosaEntry[];
  avatar: CuriosaEntry | null;
  sideboard: CuriosaEntry[];
  maybeboard: CuriosaEntry[];
}
