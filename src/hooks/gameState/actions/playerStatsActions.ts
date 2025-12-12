import { GameState, Player } from '../../../types';

type SetState = (fn: (state: GameState) => Partial<GameState>) => void;

export interface PlayerStatsActions {
  adjustLife: (player: Player, amount: number) => void;
  adjustMana: (player: Player, amount: number) => void;
  adjustManaTotal: (player: Player, amount: number) => void;
  adjustThreshold: (player: Player, element: 'air' | 'earth' | 'fire' | 'water', amount: number) => void;
}

export function createPlayerStatsActions(set: SetState): PlayerStatsActions {
  return {
    adjustLife: (player, amount) => {
      set((state) => ({
        playerLife: player === 'player' ? state.playerLife + amount : state.playerLife,
        opponentLife: player === 'opponent' ? state.opponentLife + amount : state.opponentLife,
      }));
    },

    adjustMana: (player, amount) => {
      set((state) => ({
        playerMana: player === 'player' ? Math.max(0, state.playerMana + amount) : state.playerMana,
        opponentMana: player === 'opponent' ? Math.max(0, state.opponentMana + amount) : state.opponentMana,
      }));
    },

    adjustManaTotal: (player, amount) => {
      set((state) => ({
        playerManaTotal: player === 'player' ? Math.max(0, state.playerManaTotal + amount) : state.playerManaTotal,
        opponentManaTotal: player === 'opponent' ? Math.max(0, state.opponentManaTotal + amount) : state.opponentManaTotal,
      }));
    },

    adjustThreshold: (player, element, amount) => {
      set((state) => {
        if (player === 'player') {
          return {
            playerThresholds: {
              ...state.playerThresholds,
              [element]: Math.max(0, state.playerThresholds[element] + amount),
            },
          };
        } else {
          return {
            opponentThresholds: {
              ...state.opponentThresholds,
              [element]: Math.max(0, state.opponentThresholds[element] + amount),
            },
          };
        }
      });
    },
  };
}
