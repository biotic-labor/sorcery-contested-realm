import { CardData, CardType } from '../../types/card';

export interface TokenDefinition {
  name: string;
  slug: string;
  type: CardType;
  attack?: number | null;
  defence?: number | null;
  life?: number | null;
  attachable?: boolean; // Can be dropped on other cards
  fullSize?: boolean; // Renders at full size instead of xsmall
}

// Predefined token cards available to spawn
// Slugs verified from local assets (CDN-hosted)
export const PREDEFINED_TOKENS: TokenDefinition[] = [
  // Minion tokens (xsmall size)
  { name: 'Foot Soldier', slug: 'alp-foot_soldier_1-bt-s', type: 'Minion', attack: 2, defence: 2, life: null },
  { name: 'Frog (Blue)', slug: 'alp-frog_blue-bt-s', type: 'Minion', attack: 1, defence: 1, life: null },
  { name: 'Frog (Green)', slug: 'alp-frog_green-bt-s', type: 'Minion', attack: 1, defence: 1, life: null },
  { name: 'Frog (Red)', slug: 'alp-frog_red-bt-s', type: 'Minion', attack: 1, defence: 1, life: null },
  { name: 'Skeleton', slug: 'skeleton', type: 'Minion', attack: 1, defence: 1, life: null },
  // Full-size minion tokens
  { name: 'Tawny', slug: 'art-tawny-bt-s', type: 'Minion', attack: 2, defence: 2, life: null, fullSize: true },
  { name: 'Bruin', slug: 'art-bruin-bt-s', type: 'Minion', attack: 4, defence: 4, life: null, fullSize: true },
  // Attachable tokens (can be dropped on other cards)
  { name: 'Stealth', slug: 'stealth', type: 'Aura', attack: null, defence: null, life: null, attachable: true },
  { name: 'Lance', slug: 'art-lance-bt-s', type: 'Artifact', attack: null, defence: null, life: null, attachable: true },
  { name: 'Disabled', slug: 'disabled', type: 'Aura', attack: null, defence: null, life: null, attachable: true },
  { name: 'Ward', slug: 'ward', type: 'Aura', attack: null, defence: null, life: null, attachable: true },
  { name: 'Flooded', slug: 'flooded', type: 'Aura', attack: null, defence: null, life: null, attachable: true },
  // Site token (full size, landscape)
  { name: 'Rubble', slug: 'alp-rubble-bt-s', type: 'Site', attack: null, defence: null, life: null },
];

// Create CardData from a token definition
export function createTokenCardData(token: TokenDefinition): CardData {
  return {
    name: token.name,
    guardian: {
      rarity: null,
      type: token.type,
      rulesText: '',
      cost: 0,
      attack: token.attack ?? null,
      defence: token.defence ?? null,
      life: token.life ?? null,
      thresholds: { air: 0, earth: 0, fire: 0, water: 0 },
    },
    elements: '',
    subTypes: 'Token',
    sets: [],
  };
}
