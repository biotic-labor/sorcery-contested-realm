import { CardInstance, CardData, CardVariant } from '../types';

// Mock card data for testing without real images
const mockSiteCard: CardData = {
  name: 'Dark Tower',
  guardian: {
    rarity: 'Ordinary',
    type: 'Site',
    rulesText: 'Genesis - If this is the only Dark Tower you control, gain 1 this turn.',
    cost: null,
    attack: null,
    defence: null,
    life: null,
    thresholds: { air: 1, earth: 0, fire: 0, water: 0 },
  },
  elements: 'Air',
  subTypes: '',
  sets: [],
};

const mockMinionCard: CardData = {
  name: 'Apprentice Wizard',
  guardian: {
    rarity: 'Ordinary',
    type: 'Minion',
    rulesText: 'Spellcaster\nGenesis - Draw a spell.',
    cost: 3,
    attack: 1,
    defence: 1,
    life: null,
    thresholds: { air: 1, earth: 0, fire: 0, water: 0 },
  },
  elements: 'Air',
  subTypes: 'Mortal',
  sets: [],
};

const mockMinionCard2: CardData = {
  name: 'Cloud Spirit',
  guardian: {
    rarity: 'Ordinary',
    type: 'Minion',
    rulesText: 'Airborne, Movement +2',
    cost: 2,
    attack: 2,
    defence: 2,
    life: null,
    thresholds: { air: 2, earth: 0, fire: 0, water: 0 },
  },
  elements: 'Air',
  subTypes: 'Spirit',
  sets: [],
};

const mockAvatarCard: CardData = {
  name: 'Avatar of Air',
  guardian: {
    rarity: null,
    type: 'Avatar',
    rulesText: 'Tap - Play or draw a site.',
    cost: null,
    attack: 1,
    defence: 1,
    life: 20,
    thresholds: { air: 0, earth: 0, fire: 0, water: 0 },
  },
  elements: 'None',
  subTypes: '',
  sets: [],
};

function createVariant(slug: string): CardVariant {
  return {
    slug,
    finish: 'Standard',
    product: 'Alpha',
    artist: '',
    flavorText: '',
    typeText: '',
  };
}

let cardIdCounter = 0;

function createCardInstance(cardData: CardData, slug: string, owner: 'player' | 'opponent'): CardInstance {
  cardIdCounter++;
  return {
    id: `card-${cardIdCounter}`,
    cardData,
    variant: createVariant(slug),
    rotation: 0,
    owner,
  };
}

export function createMockCards(): CardInstance[] {
  return [
    // 3 sites
    createCardInstance(mockSiteCard, 'alp-dark_tower-b-s', 'player'),
    createCardInstance({ ...mockSiteCard, name: 'Cloud City' }, 'alp-cloud_city-b-s', 'player'),
    createCardInstance({ ...mockSiteCard, name: 'Storm Spire' }, 'alp-storm_spire-b-s', 'player'),
    // 3 spells
    createCardInstance(mockMinionCard, 'alp-apprentice_wizard-b-s', 'player'),
    createCardInstance(mockMinionCard2, 'alp-cloud_spirit-b-s', 'player'),
    createCardInstance({ ...mockMinionCard, name: 'Grim Reaper' }, 'alp-grim_reaper-b-s', 'player'),
  ];
}

export function createMockAvatar(owner: 'player' | 'opponent'): CardInstance {
  return createCardInstance(mockAvatarCard, 'alp-avatar_of_air-pd-s', owner);
}
