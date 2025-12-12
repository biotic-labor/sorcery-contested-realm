import { GameState, CardInstance, Player } from '../../../types';
import { generateCardId } from '../../../utils/cardTransform';

type SetState = (fn: (state: GameState) => Partial<GameState>) => void;
type GetState = () => GameState;

export interface ZoneActions {
  addToHand: (card: CardInstance, player: Player) => void;
  removeFromHand: (cardId: string, player: Player) => void;
  reorderHand: (player: Player, fromIndex: number, toIndex: number) => void;
  addToGraveyard: (card: CardInstance, player: Player) => void;
  removeFromGraveyard: (cardId: string, player: Player) => CardInstance | null;
  addToCollection: (card: CardInstance, player: Player) => void;
  removeFromCollection: (cardId: string, player: Player) => CardInstance | null;
  addToSpellStack: (card: CardInstance, player: Player) => void;
  removeFromSpellStack: (cardId: string, player: Player) => CardInstance | null;
  clearSpellStack: (player: Player) => void;
  copyCard: (card: CardInstance, player: Player) => CardInstance;
}

export function createZoneActions(set: SetState, get: GetState): ZoneActions {
  return {
    addToHand: (card, player) => {
      set((state) => ({
        playerHand: player === 'player' ? [...state.playerHand, card] : state.playerHand,
        opponentHand: player === 'opponent' ? [...state.opponentHand, card] : state.opponentHand,
      }));
    },

    removeFromHand: (cardId, player) => {
      set((state) => ({
        playerHand: player === 'player'
          ? state.playerHand.filter((c) => c.id !== cardId)
          : state.playerHand,
        opponentHand: player === 'opponent'
          ? state.opponentHand.filter((c) => c.id !== cardId)
          : state.opponentHand,
      }));
    },

    reorderHand: (player, fromIndex, toIndex) => {
      set((state) => {
        const hand = player === 'player' ? [...state.playerHand] : [...state.opponentHand];
        const [card] = hand.splice(fromIndex, 1);
        hand.splice(toIndex, 0, card);
        return player === 'player'
          ? { playerHand: hand }
          : { opponentHand: hand };
      });
    },

    addToGraveyard: (card, player) => {
      set((state) => ({
        playerGraveyard: player === 'player' ? [...state.playerGraveyard, card] : state.playerGraveyard,
        opponentGraveyard: player === 'opponent' ? [...state.opponentGraveyard, card] : state.opponentGraveyard,
      }));
    },

    removeFromGraveyard: (cardId, player) => {
      let removedCard: CardInstance | null = null;
      set((state) => {
        const graveyard = player === 'player' ? [...state.playerGraveyard] : [...state.opponentGraveyard];
        const index = graveyard.findIndex((c) => c.id === cardId);
        if (index !== -1) {
          [removedCard] = graveyard.splice(index, 1);
        }
        return player === 'player'
          ? { playerGraveyard: graveyard }
          : { opponentGraveyard: graveyard };
      });
      return removedCard;
    },

    addToCollection: (card, player) => {
      set((state) => ({
        playerCollection: player === 'player' ? [...state.playerCollection, card] : state.playerCollection,
        opponentCollection: player === 'opponent' ? [...state.opponentCollection, card] : state.opponentCollection,
      }));
    },

    removeFromCollection: (cardId, player) => {
      let removedCard: CardInstance | null = null;
      set((state) => {
        const collection = player === 'player' ? [...state.playerCollection] : [...state.opponentCollection];
        const index = collection.findIndex((c) => c.id === cardId);
        if (index !== -1) {
          [removedCard] = collection.splice(index, 1);
        }
        return player === 'player'
          ? { playerCollection: collection }
          : { opponentCollection: collection };
      });
      return removedCard;
    },

    addToSpellStack: (card, player) => {
      set((state) => ({
        playerSpellStack: player === 'player' ? [...state.playerSpellStack, card] : state.playerSpellStack,
        opponentSpellStack: player === 'opponent' ? [...state.opponentSpellStack, card] : state.opponentSpellStack,
      }));
    },

    removeFromSpellStack: (cardId, player) => {
      let removedCard: CardInstance | null = null;
      set((state) => {
        const stack = player === 'player' ? [...state.playerSpellStack] : [...state.opponentSpellStack];
        const index = stack.findIndex((c) => c.id === cardId);
        if (index !== -1) {
          [removedCard] = stack.splice(index, 1);
        }
        return player === 'player'
          ? { playerSpellStack: stack }
          : { opponentSpellStack: stack };
      });
      return removedCard;
    },

    clearSpellStack: (player) => {
      set(() => ({
        playerSpellStack: player === 'player' ? [] : get().playerSpellStack,
        opponentSpellStack: player === 'opponent' ? [] : get().opponentSpellStack,
      }));
    },

    copyCard: (card, player) => {
      const copy: CardInstance = {
        ...card,
        id: generateCardId(player),
      };
      set((state) => ({
        playerSpellStack: player === 'player' ? [...state.playerSpellStack, copy] : state.playerSpellStack,
        opponentSpellStack: player === 'opponent' ? [...state.opponentSpellStack, copy] : state.opponentSpellStack,
      }));
      return copy;
    },
  };
}
