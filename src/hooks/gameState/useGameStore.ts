import { create } from 'zustand';
import { GameState, Player, DeckType } from '../../types';
import { initialState } from './initialState';
import { GameActions } from './types';
import {
  createBoardActions,
  createCardStateActions,
  createDeckActions,
  createGameControlActions,
  createPlayerStatsActions,
  createTokenActions,
  createZoneActions,
} from './actions';

export const useGameStore = create<GameState & GameActions>((set, get) => {
  // Helper to set shuffling state (needed by deck actions)
  const setShuffling = (deck: { player: Player; deckType: DeckType } | null) => {
    set({ shufflingDeck: deck });
  };

  // Create deck actions first (needed by game control actions)
  const deckActions = createDeckActions(set, get, setShuffling);

  // Create all action slices
  const boardActions = createBoardActions(set);
  const cardStateActions = createCardStateActions(set);
  const playerStatsActions = createPlayerStatsActions(set);
  const tokenActions = createTokenActions(set);
  const zoneActions = createZoneActions(set, get);
  const gameControlActions = createGameControlActions(set, get, deckActions.shuffleDeck);

  return {
    ...initialState,
    ...boardActions,
    ...cardStateActions,
    ...deckActions,
    ...playerStatsActions,
    ...tokenActions,
    ...zoneActions,
    ...gameControlActions,
  };
});
