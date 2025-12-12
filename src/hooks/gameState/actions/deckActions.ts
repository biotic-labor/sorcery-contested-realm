import { GameState, CardInstance } from '../../../types';

type SetState = (fn: (state: GameState) => Partial<GameState>) => void;
type GetState = () => GameState;

export interface DeckActions {
  shuffleDeck: (player: 'player' | 'opponent', deckType: 'site' | 'spell') => void;
  drawCards: (player: 'player' | 'opponent', deckType: 'site' | 'spell', count: number) => void;
  putCardOnTop: (card: CardInstance, player: 'player' | 'opponent', deckType: 'site' | 'spell') => void;
  putCardOnBottom: (card: CardInstance, player: 'player' | 'opponent', deckType: 'site' | 'spell') => void;
  peekDeck: (player: 'player' | 'opponent', deckType: 'site' | 'spell', count: number) => CardInstance[];
  returnCardsToDeck: (cards: CardInstance[], player: 'player' | 'opponent', deckType: 'site' | 'spell', position: 'top' | 'bottom') => void;
  removeTopCardFromDeck: (player: 'player' | 'opponent', deckType: 'site' | 'spell') => CardInstance | null;
  removeCardFromDeckById: (cardId: string, player: 'player' | 'opponent', deckType: 'site' | 'spell') => boolean;
}

export function createDeckActions(
  set: SetState,
  get: GetState,
  setShuffling: (deck: { player: 'player' | 'opponent'; deckType: 'site' | 'spell' } | null) => void
): DeckActions {
  return {
    shuffleDeck: (player, deckType) => {
      setShuffling({ player, deckType });

      set((state) => {
        const deckKey = `${player}${deckType === 'site' ? 'Site' : 'Spell'}Deck` as keyof GameState;
        const deck = [...(state[deckKey] as CardInstance[])];
        // Fisher-Yates shuffle
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return { [deckKey]: deck } as Partial<GameState>;
      });

      setTimeout(() => {
        setShuffling(null);
      }, 600);
    },

    drawCards: (player, deckType, count) => {
      set((state) => {
        const deckKey = `${player}${deckType === 'site' ? 'Site' : 'Spell'}Deck` as keyof GameState;
        const handKey = `${player}Hand` as keyof GameState;
        const deck = [...(state[deckKey] as CardInstance[])];
        const hand = [...(state[handKey] as CardInstance[])];

        const cardsToDraw = Math.min(count, deck.length);
        const drawnCards = deck.splice(0, cardsToDraw);
        const taggedCards = drawnCards.map(card => ({ ...card, sourceDeck: deckType }));
        hand.push(...taggedCards);

        return { [deckKey]: deck, [handKey]: hand } as Partial<GameState>;
      });
    },

    putCardOnTop: (card, player, deckType) => {
      set((state) => {
        const deckKey = `${player}${deckType === 'site' ? 'Site' : 'Spell'}Deck` as keyof GameState;
        const deck = [...(state[deckKey] as CardInstance[])];
        deck.unshift(card);
        return { [deckKey]: deck } as Partial<GameState>;
      });
    },

    putCardOnBottom: (card, player, deckType) => {
      set((state) => {
        const deckKey = `${player}${deckType === 'site' ? 'Site' : 'Spell'}Deck` as keyof GameState;
        const deck = [...(state[deckKey] as CardInstance[])];
        deck.push(card);
        return { [deckKey]: deck } as Partial<GameState>;
      });
    },

    peekDeck: (player, deckType, count) => {
      const state = get();
      const deckKey = `${player}${deckType === 'site' ? 'Site' : 'Spell'}Deck` as keyof GameState;
      const deck = state[deckKey] as CardInstance[];
      const actualCount = count === -1 ? deck.length : Math.min(count, deck.length);
      const peekedCards = deck.slice(0, actualCount);

      set(() => {
        const currentDeck = [...(get()[deckKey] as CardInstance[])];
        return { [deckKey]: currentDeck.slice(actualCount) } as Partial<GameState>;
      });

      return peekedCards;
    },

    returnCardsToDeck: (cards, player, deckType, position) => {
      set((state) => {
        const deckKey = `${player}${deckType === 'site' ? 'Site' : 'Spell'}Deck` as keyof GameState;
        const deck = [...(state[deckKey] as CardInstance[])];

        if (position === 'top') {
          return { [deckKey]: [...cards, ...deck] } as Partial<GameState>;
        } else {
          return { [deckKey]: [...deck, ...cards] } as Partial<GameState>;
        }
      });
    },

    removeTopCardFromDeck: (player, deckType) => {
      const state = get();
      const deckKey = `${player}${deckType === 'site' ? 'Site' : 'Spell'}Deck` as keyof GameState;
      const deck = state[deckKey] as CardInstance[];

      if (deck.length === 0) return null;

      const topCard = deck[0];

      set(() => {
        const currentDeck = [...(get()[deckKey] as CardInstance[])];
        return { [deckKey]: currentDeck.slice(1) } as Partial<GameState>;
      });

      return topCard;
    },

    removeCardFromDeckById: (cardId, player, deckType) => {
      const state = get();
      const deckKey = `${player}${deckType === 'site' ? 'Site' : 'Spell'}Deck` as keyof GameState;
      const deck = state[deckKey] as CardInstance[];

      const index = deck.findIndex((c) => c.id === cardId);
      if (index === -1) return false;

      set(() => {
        const currentDeck = [...(get()[deckKey] as CardInstance[])];
        const currentIndex = currentDeck.findIndex((c) => c.id === cardId);
        if (currentIndex === -1) return {};
        currentDeck.splice(currentIndex, 1);
        return { [deckKey]: currentDeck } as Partial<GameState>;
      });

      return true;
    },
  };
}
