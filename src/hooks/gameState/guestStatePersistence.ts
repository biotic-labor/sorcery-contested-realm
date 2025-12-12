import { GameState, CardInstance } from '../../types';

// localStorage key for persisting guest's private game state
const GUEST_STATE_KEY = 'sorcery-guest-state';

export interface GuestPersistedState {
  gameCode: string;
  opponentHand: CardInstance[];
  opponentSiteDeck: CardInstance[];
  opponentSpellDeck: CardInstance[];
  opponentGraveyard: CardInstance[];
  opponentCollection: CardInstance[];
  timestamp: number;
}

// Save guest's private state to localStorage
export function saveGuestState(gameCode: string, state: GameState): void {
  const persisted: GuestPersistedState = {
    gameCode,
    opponentHand: state.opponentHand,
    opponentSiteDeck: state.opponentSiteDeck,
    opponentSpellDeck: state.opponentSpellDeck,
    opponentGraveyard: state.opponentGraveyard,
    opponentCollection: state.opponentCollection,
    timestamp: Date.now(),
  };
  try {
    localStorage.setItem(GUEST_STATE_KEY, JSON.stringify(persisted));
  } catch (e) {
    console.warn('Failed to save guest state to localStorage:', e);
  }
}

// Load guest's private state from localStorage (if matching game code)
export function loadGuestState(gameCode: string): GuestPersistedState | null {
  try {
    const stored = localStorage.getItem(GUEST_STATE_KEY);
    if (!stored) return null;
    const persisted: GuestPersistedState = JSON.parse(stored);
    // Only return if game code matches and not too old (1 hour)
    if (persisted.gameCode === gameCode && Date.now() - persisted.timestamp < 3600000) {
      return persisted;
    }
    return null;
  } catch (e) {
    console.warn('Failed to load guest state from localStorage:', e);
    return null;
  }
}

// Clear persisted guest state
export function clearGuestState(): void {
  try {
    localStorage.removeItem(GUEST_STATE_KEY);
  } catch (e) {
    // Ignore
  }
}
