import { SerializedGameState } from '../../types/multiplayer';
import { Player, CardInstance } from '../../types';

/**
 * Swap player/opponent perspective in serialized game state.
 * Used when syncing state from host to guest (guest sees their data as "player").
 */
export function swapPerspective(state: SerializedGameState): SerializedGameState {
  return {
    ...state,
    playerHand: state.opponentHand,
    opponentHand: state.playerHand,
    playerSiteDeck: state.opponentSiteDeck,
    opponentSiteDeck: state.playerSiteDeck,
    playerSpellDeck: state.opponentSpellDeck,
    opponentSpellDeck: state.playerSpellDeck,
    playerGraveyard: state.opponentGraveyard,
    opponentGraveyard: state.playerGraveyard,
    playerSpellStack: state.opponentSpellStack,
    opponentSpellStack: state.playerSpellStack,
    playerLife: state.opponentLife,
    opponentLife: state.playerLife,
    playerMana: state.opponentMana,
    opponentMana: state.playerMana,
    playerManaTotal: state.opponentManaTotal,
    opponentManaTotal: state.playerManaTotal,
    playerThresholds: state.opponentThresholds,
    opponentThresholds: state.playerThresholds,
    currentTurn: state.currentTurn === 'player' ? 'opponent' : 'player',
  };
}

/**
 * Generate unique ID for log entries.
 */
export function generateLogId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Swap player references for remote actions.
 */
export function swapPlayer(player: Player): Player {
  return player === 'player' ? 'opponent' : 'player';
}

/**
 * Create hidden placeholder cards for opponent's deck (we can't see their cards).
 */
export function createHiddenCards(count: number, owner: Player, sourceDeck?: 'site' | 'spell'): CardInstance[] {
  const timestamp = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    id: `hidden-${owner}-${sourceDeck || 'deck'}-${i}-${timestamp}`,
    cardData: {
      name: 'Hidden',
      guardian: {
        rarity: 'Ordinary' as const,
        type: 'Minion' as const,
        rulesText: '',
        cost: null,
        attack: null,
        defence: null,
        life: null,
        thresholds: { air: 0, earth: 0, fire: 0, water: 0 },
      },
      elements: '',
      subTypes: '',
      sets: [],
    },
    variant: {
      slug: 'hidden',
      finish: 'Standard' as const,
      product: '',
      artist: '',
      flavorText: '',
      typeText: '',
    },
    rotation: 0,
    owner,
    sourceDeck,
  }));
}
