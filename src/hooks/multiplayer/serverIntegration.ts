import { useGameStore, saveGuestState, clearGuestState } from '../useGameState';
import { SerializedGameState } from '../../types/multiplayer';

// Helper to get serializable game state
export function getSerializedGameState(): SerializedGameState {
  const state = useGameStore.getState();
  return {
    board: state.board,
    vertices: state.vertices,
    playerHand: state.playerHand,
    opponentHand: state.opponentHand,
    playerSiteDeck: state.playerSiteDeck,
    playerSpellDeck: state.playerSpellDeck,
    opponentSiteDeck: state.opponentSiteDeck,
    opponentSpellDeck: state.opponentSpellDeck,
    playerGraveyard: state.playerGraveyard,
    opponentGraveyard: state.opponentGraveyard,
    playerSpellStack: state.playerSpellStack,
    opponentSpellStack: state.opponentSpellStack,
    playerLife: state.playerLife,
    opponentLife: state.opponentLife,
    playerMana: state.playerMana,
    playerManaTotal: state.playerManaTotal,
    opponentMana: state.opponentMana,
    opponentManaTotal: state.opponentManaTotal,
    playerThresholds: state.playerThresholds,
    opponentThresholds: state.opponentThresholds,
    currentTurn: state.currentTurn,
    turnNumber: state.turnNumber,
  };
}

// Track subscription for guest state auto-save
let guestStateSaveUnsubscribe: (() => void) | null = null;
let guestServerSaveTimer: ReturnType<typeof setTimeout> | null = null;

// Save guest's private state to server
async function saveGuestStateToServer(gameCode: string): Promise<void> {
  try {
    const gameState = useGameStore.getState();
    const guestPrivateState = {
      opponentHand: gameState.opponentHand,
      opponentSiteDeck: gameState.opponentSiteDeck,
      opponentSpellDeck: gameState.opponentSpellDeck,
      opponentGraveyard: gameState.opponentGraveyard,
    };
    await fetch(`/api/games/${encodeURIComponent(gameCode)}/guest-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: guestPrivateState }),
    });
  } catch (error) {
    console.error('Failed to save guest state to server:', error);
  }
}

// Set up auto-save for guest's private state
export function setupGuestStateAutoSave(gameCode: string): void {
  // Clean up any existing subscription
  if (guestStateSaveUnsubscribe) {
    guestStateSaveUnsubscribe();
  }
  if (guestServerSaveTimer) {
    clearTimeout(guestServerSaveTimer);
  }

  // Debounced server save
  const debouncedServerSave = () => {
    if (guestServerSaveTimer) {
      clearTimeout(guestServerSaveTimer);
    }
    guestServerSaveTimer = setTimeout(() => {
      saveGuestStateToServer(gameCode);
    }, 5000);
  };

  // Subscribe to game store changes and save guest's private data
  guestStateSaveUnsubscribe = useGameStore.subscribe((state, prevState) => {
    // Only save if guest's private data changed
    if (
      state.opponentHand !== prevState.opponentHand ||
      state.opponentSiteDeck !== prevState.opponentSiteDeck ||
      state.opponentSpellDeck !== prevState.opponentSpellDeck ||
      state.opponentGraveyard !== prevState.opponentGraveyard
    ) {
      // Save to localStorage (immediate)
      saveGuestState(gameCode, state);
      // Save to server (debounced)
      debouncedServerSave();
    }
  });
}

// Clean up guest state subscription
export function cleanupGuestStateAutoSave(): void {
  if (guestStateSaveUnsubscribe) {
    guestStateSaveUnsubscribe();
    guestStateSaveUnsubscribe = null;
  }
  if (guestServerSaveTimer) {
    clearTimeout(guestServerSaveTimer);
    guestServerSaveTimer = null;
  }
  clearGuestState();
}

// Server state save for reconnection support
let serverStateSaveTimer: ReturnType<typeof setTimeout> | null = null;
let serverStateSaveUnsubscribe: (() => void) | null = null;

export async function registerGameWithServer(gameCode: string, peerId: string, nickname: string): Promise<void> {
  try {
    await fetch(`/api/games/${encodeURIComponent(gameCode)}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId, nickname }),
    });
  } catch (error) {
    console.error('Failed to register game with server:', error);
  }
}

export async function registerGuestWithServer(gameCode: string, peerId: string, nickname: string): Promise<void> {
  try {
    await fetch(`/api/games/${encodeURIComponent(gameCode)}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId, nickname }),
    });
  } catch (error) {
    console.error('Failed to register guest with server:', error);
  }
}

export async function saveStateToServer(gameCode: string): Promise<void> {
  try {
    const state = getSerializedGameState();
    await fetch(`/api/games/${encodeURIComponent(gameCode)}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    });
  } catch (error) {
    console.error('Failed to save game state to server:', error);
  }
}

export async function updateGameStatusOnServer(gameCode: string, status: 'waiting' | 'playing' | 'finished'): Promise<void> {
  try {
    await fetch(`/api/games/${encodeURIComponent(gameCode)}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  } catch (error) {
    console.error('Failed to update game status:', error);
  }
}

export function setupHostStateAutoSave(gameCode: string): void {
  // Clean up any existing subscription
  if (serverStateSaveUnsubscribe) {
    serverStateSaveUnsubscribe();
  }
  if (serverStateSaveTimer) {
    clearTimeout(serverStateSaveTimer);
  }

  // Debounced save - waits 5 seconds after last change
  const debouncedSave = () => {
    if (serverStateSaveTimer) {
      clearTimeout(serverStateSaveTimer);
    }
    serverStateSaveTimer = setTimeout(() => {
      saveStateToServer(gameCode);
    }, 5000);
  };

  // Subscribe to game store changes
  serverStateSaveUnsubscribe = useGameStore.subscribe(() => {
    debouncedSave();
  });
}

export function cleanupHostStateAutoSave(): void {
  if (serverStateSaveUnsubscribe) {
    serverStateSaveUnsubscribe();
    serverStateSaveUnsubscribe = null;
  }
  if (serverStateSaveTimer) {
    clearTimeout(serverStateSaveTimer);
    serverStateSaveTimer = null;
  }
}
