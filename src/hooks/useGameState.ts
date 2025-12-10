import { create } from 'zustand';
import {
  GameState,
  BoardPosition,
  createEmptyBoard,
  positionKey,
  CardInstance,
  Player,
  DeckType,
} from '../types';
import { SerializedGameState } from '../types/multiplayer';

// localStorage key for persisting guest's private game state
const GUEST_STATE_KEY = 'sorcery-guest-state';

interface GuestPersistedState {
  gameCode: string;
  opponentHand: CardInstance[];
  opponentSiteDeck: CardInstance[];
  opponentSpellDeck: CardInstance[];
  opponentGraveyard: CardInstance[];
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

interface GameActions {
  // Card placement
  placeCardOnSite: (card: CardInstance, position: BoardPosition) => void;
  placeUnitOnSite: (card: CardInstance, position: BoardPosition) => void;
  moveCard: (cardId: string, from: BoardPosition, to: BoardPosition) => void;

  // Vertex placement
  placeUnitOnVertex: (card: CardInstance, vertexKey: string) => void;
  removeCardFromVertex: (cardId: string, vertexKey: string) => void;

  // Card rotation (tap/untap)
  rotateCard: (cardId: string) => void;
  untapAllCards: (player: Player) => void;

  // Card counters
  adjustCardCounter: (cardId: string, amount: number) => void;

  // Card flip (face-down/face-up)
  flipCard: (cardId: string) => void;

  // Card under/over toggle
  toggleCardUnder: (cardId: string) => void;

  // Hand management
  addToHand: (card: CardInstance, player: Player) => void;
  removeFromHand: (cardId: string, player: Player) => void;
  reorderHand: (player: Player, fromIndex: number, toIndex: number) => void;

  // Life management
  adjustLife: (player: Player, amount: number) => void;

  // Mana management
  adjustMana: (player: Player, amount: number) => void;
  adjustManaTotal: (player: Player, amount: number) => void;

  // Turn management
  startTurn: (player: Player) => void;
  endTurn: () => void;

  // Selection
  selectCard: (card: CardInstance | null) => void;
  hoverCard: (card: CardInstance | null) => void;

  // Avatar placement
  placeAvatar: (card: CardInstance, position: BoardPosition) => void;
  moveAvatar: (cardId: string, from: BoardPosition, to: BoardPosition) => void;

  // Deck management
  shuffleDeck: (player: Player, deckType: DeckType) => void;
  drawCards: (player: Player, deckType: DeckType, count: number) => void;
  putCardOnTop: (card: CardInstance, player: Player, deckType: DeckType) => void;
  putCardOnBottom: (card: CardInstance, player: Player, deckType: DeckType) => void;

  // Deck search
  peekDeck: (player: Player, deckType: DeckType, count: number) => CardInstance[];
  returnCardsToDeck: (cards: CardInstance[], player: Player, deckType: DeckType, position: 'top' | 'bottom') => void;

  // Remove top card from deck (for drag operations)
  removeTopCardFromDeck: (player: Player, deckType: DeckType) => CardInstance | null;

  // Graveyard
  addToGraveyard: (card: CardInstance, player: Player) => void;
  removeFromGraveyard: (cardId: string, player: Player) => CardInstance | null;

  // Spell stack (casting zone)
  addToSpellStack: (card: CardInstance, player: Player) => void;
  removeFromSpellStack: (cardId: string, player: Player) => CardInstance | null;
  clearSpellStack: (player: Player) => void;

  // Deck hover tracking
  setHoveredDeck: (deck: { player: Player; deckType: DeckType } | null) => void;

  // Remove card from board
  removeCardFromBoard: (cardId: string, position: BoardPosition) => void;

  // Reset game
  resetGame: () => void;

  // Deck import
  importDeck: (
    siteCards: CardInstance[],
    spellCards: CardInstance[],
    avatar: CardInstance | null,
    player: Player
  ) => void;
  clearDecks: (player: Player) => void;
  // Set decks directly (for multiplayer sync - no shuffle)
  setDecks: (player: Player, siteCards: CardInstance[], spellCards: CardInstance[]) => void;

  // Apply full state (for reconnection sync)
  applyFullState: (state: SerializedGameState) => void;
}

const initialState: GameState = {
  board: createEmptyBoard(),
  avatars: {},
  vertices: {},
  playerHand: [],
  opponentHand: [],
  playerSiteDeck: [],
  playerSpellDeck: [],
  opponentSiteDeck: [],
  opponentSpellDeck: [],
  playerGraveyard: [],
  opponentGraveyard: [],
  playerSpellStack: [],
  opponentSpellStack: [],
  playerLife: 20,
  opponentLife: 20,
  playerMana: 0,
  playerManaTotal: 0,
  opponentMana: 0,
  opponentManaTotal: 0,
  playerThresholds: { air: 0, earth: 0, fire: 0, water: 0 },
  opponentThresholds: { air: 0, earth: 0, fire: 0, water: 0 },
  currentTurn: 'player',
  turnNumber: 1,
  selectedCard: null,
  hoveredCard: null,
  hoveredDeck: null,
  shufflingDeck: null,
};

export const useGameStore = create<GameState & GameActions>((set) => ({
  ...initialState,

  placeCardOnSite: (card, position) => {
    set((state) => {
      const newBoard = [...state.board.map((row) => [...row.map((site) => ({ ...site }))])];
      newBoard[position.row][position.col].siteCard = card;

      // Get site thresholds
      const siteThresholds = card.cardData.guardian.thresholds;

      // Auto-increment total mana and thresholds when a site is placed
      if (card.owner === 'player') {
        return {
          board: newBoard,
          playerManaTotal: state.playerManaTotal + 1,
          playerThresholds: {
            air: state.playerThresholds.air + siteThresholds.air,
            earth: state.playerThresholds.earth + siteThresholds.earth,
            fire: state.playerThresholds.fire + siteThresholds.fire,
            water: state.playerThresholds.water + siteThresholds.water,
          },
        };
      } else {
        return {
          board: newBoard,
          opponentManaTotal: state.opponentManaTotal + 1,
          opponentThresholds: {
            air: state.opponentThresholds.air + siteThresholds.air,
            earth: state.opponentThresholds.earth + siteThresholds.earth,
            fire: state.opponentThresholds.fire + siteThresholds.fire,
            water: state.opponentThresholds.water + siteThresholds.water,
          },
        };
      }
    });
  },

  placeUnitOnSite: (card, position) => {
    set((state) => {
      const newBoard = [...state.board.map((row) => [...row.map((site) => ({ ...site, units: [...site.units] }))])];
      newBoard[position.row][position.col].units.push(card);
      return { board: newBoard };
    });
  },

  placeUnitOnVertex: (card, vertexKey) => {
    set((state) => {
      const newVertices = { ...state.vertices };
      if (!newVertices[vertexKey]) {
        newVertices[vertexKey] = [];
      }
      newVertices[vertexKey] = [...newVertices[vertexKey], card];
      return { vertices: newVertices };
    });
  },

  removeCardFromVertex: (cardId, vertexKey) => {
    set((state) => {
      const newVertices = { ...state.vertices };
      if (newVertices[vertexKey]) {
        newVertices[vertexKey] = newVertices[vertexKey].filter((c) => c.id !== cardId);
        if (newVertices[vertexKey].length === 0) {
          delete newVertices[vertexKey];
        }
      }
      return { vertices: newVertices };
    });
  },

  moveCard: (cardId, from, to) => {
    set((state) => {
      const newBoard = [...state.board.map((row) => [...row.map((site) => ({ ...site, units: [...site.units] }))])];
      const fromSite = newBoard[from.row][from.col];
      const toSite = newBoard[to.row][to.col];

      // Check if it's a site card
      if (fromSite.siteCard?.id === cardId) {
        toSite.siteCard = fromSite.siteCard;
        fromSite.siteCard = null;
      } else {
        // It's a unit
        const unitIndex = fromSite.units.findIndex((u) => u.id === cardId);
        if (unitIndex !== -1) {
          const [unit] = fromSite.units.splice(unitIndex, 1);
          toSite.units.push(unit);
        }
      }

      return { board: newBoard };
    });
  },

  rotateCard: (cardId) => {
    set((state) => {
      // Check board
      const newBoard = state.board.map((row) =>
        row.map((site) => ({
          ...site,
          siteCard: site.siteCard?.id === cardId
            ? { ...site.siteCard, rotation: site.siteCard.rotation === 0 ? 90 : 0 }
            : site.siteCard,
          units: site.units.map((u) =>
            u.id === cardId ? { ...u, rotation: u.rotation === 0 ? 90 : 0 } : u
          ),
          underCards: site.underCards.map((u) =>
            u.id === cardId ? { ...u, rotation: u.rotation === 0 ? 90 : 0 } : u
          ),
        }))
      );

      // Check avatars
      const newAvatars = { ...state.avatars };
      for (const key of Object.keys(newAvatars)) {
        if (newAvatars[key].id === cardId) {
          newAvatars[key] = {
            ...newAvatars[key],
            rotation: newAvatars[key].rotation === 0 ? 90 : 0,
          };
        }
      }

      // Check vertices
      const newVertices = { ...state.vertices };
      for (const key of Object.keys(newVertices)) {
        newVertices[key] = newVertices[key].map((u) =>
          u.id === cardId ? { ...u, rotation: u.rotation === 0 ? 90 : 0 } : u
        );
      }

      return { board: newBoard, avatars: newAvatars, vertices: newVertices };
    });
  },

  untapAllCards: (player) => {
    set((state) => {
      const newBoard = state.board.map((row) =>
        row.map((site) => ({
          ...site,
          siteCard: site.siteCard?.owner === player
            ? { ...site.siteCard, rotation: 0 }
            : site.siteCard,
          units: site.units.map((u) =>
            u.owner === player ? { ...u, rotation: 0 } : u
          ),
          underCards: site.underCards.map((u) =>
            u.owner === player ? { ...u, rotation: 0 } : u
          ),
        }))
      );

      const newAvatars = { ...state.avatars };
      for (const key of Object.keys(newAvatars)) {
        if (newAvatars[key].owner === player) {
          newAvatars[key] = { ...newAvatars[key], rotation: 0 };
        }
      }

      const newVertices = { ...state.vertices };
      for (const key of Object.keys(newVertices)) {
        newVertices[key] = newVertices[key].map((u) =>
          u.owner === player ? { ...u, rotation: 0 } : u
        );
      }

      return { board: newBoard, avatars: newAvatars, vertices: newVertices };
    });
  },

  adjustCardCounter: (cardId, amount) => {
    set((state) => {
      // Helper to update counter on a card
      const updateCounter = (card: CardInstance): CardInstance => {
        const newCount = (card.counters || 0) + amount;
        // Remove counters property if 0 or less
        if (newCount <= 0) {
          const { counters: _, ...rest } = card;
          return rest as CardInstance;
        }
        return { ...card, counters: newCount };
      };

      // Check board
      const newBoard = state.board.map((row) =>
        row.map((site) => ({
          ...site,
          siteCard: site.siteCard?.id === cardId
            ? updateCounter(site.siteCard)
            : site.siteCard,
          units: site.units.map((u) =>
            u.id === cardId ? updateCounter(u) : u
          ),
          underCards: site.underCards.map((u) =>
            u.id === cardId ? updateCounter(u) : u
          ),
        }))
      );

      // Check avatars
      const newAvatars = { ...state.avatars };
      for (const key of Object.keys(newAvatars)) {
        if (newAvatars[key].id === cardId) {
          newAvatars[key] = updateCounter(newAvatars[key]);
        }
      }

      // Check vertices
      const newVertices = { ...state.vertices };
      for (const key of Object.keys(newVertices)) {
        newVertices[key] = newVertices[key].map((u) =>
          u.id === cardId ? updateCounter(u) : u
        );
      }

      return { board: newBoard, avatars: newAvatars, vertices: newVertices };
    });
  },

  flipCard: (cardId) => {
    set((state) => {
      // Helper to toggle faceDown on a card
      const toggleFaceDown = (card: CardInstance): CardInstance => {
        return { ...card, faceDown: !card.faceDown };
      };

      // Check board
      const newBoard = state.board.map((row) =>
        row.map((site) => ({
          ...site,
          siteCard: site.siteCard?.id === cardId
            ? toggleFaceDown(site.siteCard)
            : site.siteCard,
          units: site.units.map((u) =>
            u.id === cardId ? toggleFaceDown(u) : u
          ),
          underCards: site.underCards.map((u) =>
            u.id === cardId ? toggleFaceDown(u) : u
          ),
        }))
      );

      // Check avatars
      const newAvatars = { ...state.avatars };
      for (const key of Object.keys(newAvatars)) {
        if (newAvatars[key].id === cardId) {
          newAvatars[key] = toggleFaceDown(newAvatars[key]);
        }
      }

      // Check vertices
      const newVertices = { ...state.vertices };
      for (const key of Object.keys(newVertices)) {
        newVertices[key] = newVertices[key].map((u) =>
          u.id === cardId ? toggleFaceDown(u) : u
        );
      }

      return { board: newBoard, avatars: newAvatars, vertices: newVertices };
    });
  },

  toggleCardUnder: (cardId) => {
    set((state) => {
      const newBoard = state.board.map((row) =>
        row.map((site) => {
          const newSite = { ...site, units: [...site.units], underCards: [...site.underCards] };

          // Check if card is in units - move to underCards
          const unitIndex = newSite.units.findIndex((u) => u.id === cardId);
          if (unitIndex !== -1) {
            const [card] = newSite.units.splice(unitIndex, 1);
            newSite.underCards.push(card);
            return newSite;
          }

          // Check if card is in underCards - move to units
          const underIndex = newSite.underCards.findIndex((u) => u.id === cardId);
          if (underIndex !== -1) {
            const [card] = newSite.underCards.splice(underIndex, 1);
            newSite.units.push(card);
            return newSite;
          }

          return newSite;
        })
      );
      return { board: newBoard };
    });
  },

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

  startTurn: (player) => {
    set((state) => {
      // Untap all cards for this player
      const newBoard = state.board.map((row) =>
        row.map((site) => ({
          ...site,
          siteCard: site.siteCard?.owner === player
            ? { ...site.siteCard, rotation: 0 }
            : site.siteCard,
          units: site.units.map((u) =>
            u.owner === player ? { ...u, rotation: 0 } : u
          ),
          underCards: site.underCards.map((u) =>
            u.owner === player ? { ...u, rotation: 0 } : u
          ),
        }))
      );

      const newAvatars = { ...state.avatars };
      for (const key of Object.keys(newAvatars)) {
        if (newAvatars[key].owner === player) {
          newAvatars[key] = { ...newAvatars[key], rotation: 0 };
        }
      }

      const newVertices = { ...state.vertices };
      for (const key of Object.keys(newVertices)) {
        newVertices[key] = newVertices[key].map((u) =>
          u.owner === player ? { ...u, rotation: 0 } : u
        );
      }

      // Reset available mana to total
      return {
        board: newBoard,
        avatars: newAvatars,
        vertices: newVertices,
        playerMana: player === 'player' ? state.playerManaTotal : state.playerMana,
        opponentMana: player === 'opponent' ? state.opponentManaTotal : state.opponentMana,
      };
    });
  },

  endTurn: () => {
    set((state) => {
      const nextPlayer: Player = state.currentTurn === 'player' ? 'opponent' : 'player';
      return {
        currentTurn: nextPlayer,
        turnNumber: state.currentTurn === 'opponent' ? state.turnNumber + 1 : state.turnNumber,
      };
    });
  },

  selectCard: (card) => set({ selectedCard: card }),
  hoverCard: (card) => set({ hoveredCard: card }),

  placeAvatar: (card, position) => {
    set((state) => ({
      avatars: {
        ...state.avatars,
        [positionKey(position.row, position.col)]: card,
      },
    }));
  },

  moveAvatar: (cardId, from, to) => {
    set((state) => {
      const fromKey = positionKey(from.row, from.col);
      const toKey = positionKey(to.row, to.col);
      const avatar = state.avatars[fromKey];

      if (!avatar || avatar.id !== cardId) return state;

      const newAvatars = { ...state.avatars };
      delete newAvatars[fromKey];
      newAvatars[toKey] = avatar;

      return { avatars: newAvatars };
    });
  },

  shuffleDeck: (player, deckType) => {
    // Set shuffling state for animation
    set({ shufflingDeck: { player, deckType } });

    set((state) => {
      const deckKey = `${player}${deckType === 'site' ? 'Site' : 'Spell'}Deck` as keyof GameState;
      const deck = [...(state[deckKey] as CardInstance[])];
      // Fisher-Yates shuffle
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      return { [deckKey]: deck };
    });

    // Clear shuffling state after animation
    setTimeout(() => {
      set({ shufflingDeck: null });
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
      // Tag drawn cards with their source deck (for hidden card back display)
      const taggedCards = drawnCards.map(card => ({ ...card, sourceDeck: deckType }));
      hand.push(...taggedCards);

      return { [deckKey]: deck, [handKey]: hand };
    });
  },

  putCardOnTop: (card, player, deckType) => {
    set((state) => {
      const deckKey = `${player}${deckType === 'site' ? 'Site' : 'Spell'}Deck` as keyof GameState;
      const deck = [...(state[deckKey] as CardInstance[])];
      deck.unshift(card);
      return { [deckKey]: deck };
    });
  },

  putCardOnBottom: (card, player, deckType) => {
    set((state) => {
      const deckKey = `${player}${deckType === 'site' ? 'Site' : 'Spell'}Deck` as keyof GameState;
      const deck = [...(state[deckKey] as CardInstance[])];
      deck.push(card);
      return { [deckKey]: deck };
    });
  },

  peekDeck: (player, deckType, count) => {
    const state = useGameStore.getState();
    const deckKey = `${player}${deckType === 'site' ? 'Site' : 'Spell'}Deck` as keyof GameState;
    const deck = state[deckKey] as CardInstance[];
    const actualCount = count === -1 ? deck.length : Math.min(count, deck.length);
    const peekedCards = deck.slice(0, actualCount);

    // Remove peeked cards from deck
    set(() => {
      const currentDeck = [...(useGameStore.getState()[deckKey] as CardInstance[])];
      return { [deckKey]: currentDeck.slice(actualCount) };
    });

    return peekedCards;
  },

  returnCardsToDeck: (cards, player, deckType, position) => {
    set((state) => {
      const deckKey = `${player}${deckType === 'site' ? 'Site' : 'Spell'}Deck` as keyof GameState;
      const deck = [...(state[deckKey] as CardInstance[])];

      if (position === 'top') {
        // Cards array order: first card goes on top (will be drawn first)
        return { [deckKey]: [...cards, ...deck] };
      } else {
        // Cards array order: first card goes to bottom first
        return { [deckKey]: [...deck, ...cards] };
      }
    });
  },

  removeTopCardFromDeck: (player, deckType) => {
    const state = useGameStore.getState();
    const deckKey = `${player}${deckType === 'site' ? 'Site' : 'Spell'}Deck` as keyof GameState;
    const deck = state[deckKey] as CardInstance[];

    if (deck.length === 0) return null;

    const topCard = deck[0];

    set(() => {
      const currentDeck = [...(useGameStore.getState()[deckKey] as CardInstance[])];
      return { [deckKey]: currentDeck.slice(1) };
    });

    return topCard;
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

  // Spell stack (casting zone)
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
      playerSpellStack: player === 'player' ? [] : useGameStore.getState().playerSpellStack,
      opponentSpellStack: player === 'opponent' ? [] : useGameStore.getState().opponentSpellStack,
    }));
  },

  setHoveredDeck: (deck) => set({ hoveredDeck: deck }),

  removeCardFromBoard: (cardId, position) => {
    set((state) => {
      const newBoard = [...state.board.map((row) => [...row.map((site) => ({ ...site, units: [...site.units], underCards: [...site.underCards] }))])];
      const site = newBoard[position.row][position.col];

      // Check if it's a site card
      if (site.siteCard?.id === cardId) {
        site.siteCard = null;
      } else {
        // Check units
        const unitIndex = site.units.findIndex((u) => u.id === cardId);
        if (unitIndex !== -1) {
          site.units.splice(unitIndex, 1);
        } else {
          // Check underCards
          const underIndex = site.underCards.findIndex((u) => u.id === cardId);
          if (underIndex !== -1) {
            site.underCards.splice(underIndex, 1);
          }
        }
      }

      return { board: newBoard };
    });
  },

  resetGame: () => set(initialState),

  importDeck: (siteCards, spellCards, avatar, player) => {
    set((state) => {
      const siteDeckKey = player === 'player' ? 'playerSiteDeck' : 'opponentSiteDeck';
      const spellDeckKey = player === 'player' ? 'playerSpellDeck' : 'opponentSpellDeck';

      const updates: Partial<GameState> = {
        [siteDeckKey]: siteCards,
        [spellDeckKey]: spellCards,
      };

      // Place avatar at starting position
      if (avatar) {
        const avatarPosition = player === 'player' ? '3-2' : '0-2';
        updates.avatars = {
          ...state.avatars,
          [avatarPosition]: avatar,
        };
      }

      return updates as GameState;
    });

    // Shuffle both decks after import
    const store = useGameStore.getState();
    store.shuffleDeck(player, 'site');
    store.shuffleDeck(player, 'spell');
  },

  clearDecks: (player) => {
    set((state) => {
      const avatarPosition = player === 'player' ? '3-2' : '0-2';
      const newAvatars = { ...state.avatars };
      delete newAvatars[avatarPosition];

      // Clear vertices for this player
      const newVertices: Record<string, CardInstance[]> = {};
      for (const key of Object.keys(state.vertices)) {
        const filteredUnits = state.vertices[key].filter((u) => u.owner !== player);
        if (filteredUnits.length > 0) {
          newVertices[key] = filteredUnits;
        }
      }

      if (player === 'player') {
        return {
          playerSiteDeck: [],
          playerSpellDeck: [],
          playerHand: [],
          playerGraveyard: [],
          avatars: newAvatars,
          vertices: newVertices,
        };
      } else {
        return {
          opponentSiteDeck: [],
          opponentSpellDeck: [],
          opponentHand: [],
          opponentGraveyard: [],
          avatars: newAvatars,
          vertices: newVertices,
        };
      }
    });
  },

  setDecks: (player, siteCards, spellCards) => {
    set(() => {
      const siteDeckKey = player === 'player' ? 'playerSiteDeck' : 'opponentSiteDeck';
      const spellDeckKey = player === 'player' ? 'playerSpellDeck' : 'opponentSpellDeck';

      return {
        [siteDeckKey]: siteCards,
        [spellDeckKey]: spellCards,
      } as Partial<GameState>;
    });
  },

  applyFullState: (syncedState) => {
    set(() => ({
      board: syncedState.board,
      avatars: syncedState.avatars,
      vertices: syncedState.vertices,
      playerHand: syncedState.playerHand,
      opponentHand: syncedState.opponentHand,
      playerSiteDeck: syncedState.playerSiteDeck,
      playerSpellDeck: syncedState.playerSpellDeck,
      opponentSiteDeck: syncedState.opponentSiteDeck,
      opponentSpellDeck: syncedState.opponentSpellDeck,
      playerGraveyard: syncedState.playerGraveyard,
      opponentGraveyard: syncedState.opponentGraveyard,
      playerSpellStack: syncedState.playerSpellStack || [],
      opponentSpellStack: syncedState.opponentSpellStack || [],
      playerLife: syncedState.playerLife,
      opponentLife: syncedState.opponentLife,
      playerMana: syncedState.playerMana,
      playerManaTotal: syncedState.playerManaTotal,
      opponentMana: syncedState.opponentMana,
      opponentManaTotal: syncedState.opponentManaTotal,
      playerThresholds: syncedState.playerThresholds,
      opponentThresholds: syncedState.opponentThresholds,
      currentTurn: syncedState.currentTurn,
      turnNumber: syncedState.turnNumber,
      // Clear UI refs that may reference stale card instances
      selectedCard: null,
      hoveredCard: null,
      hoveredDeck: null,
      shufflingDeck: null,
    }));
  },
}));
