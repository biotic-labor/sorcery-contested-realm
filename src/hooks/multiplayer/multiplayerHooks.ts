import { useMultiplayerStore } from './useMultiplayerStore';
import { useGameStore } from '../useGameState';
import { Player } from '../../types';

/**
 * Hook to check if it's the local player's turn.
 * In single player mode (disconnected), always returns true.
 */
export function useIsMyTurn(): boolean {
  const localPlayer = useMultiplayerStore((s) => s.localPlayer);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const connectionStatus = useMultiplayerStore((s) => s.connectionStatus);

  // In single player mode, always allow actions
  if (connectionStatus === 'disconnected') {
    return true;
  }

  return currentTurn === localPlayer;
}

/**
 * Hook to get the effective player identity.
 */
export function useLocalPlayer(): Player {
  return useMultiplayerStore((s) => s.localPlayer);
}
