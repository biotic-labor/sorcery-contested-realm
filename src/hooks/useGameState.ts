import { create } from 'zustand';
import {
  GameState,
  BoardPosition,
  createEmptyBoard,
  CardInstance,
  Player,
  DeckType,
} from '../types';
import { SerializedGameState } from '../types/multiplayer';
import { generateCardId } from '../utils/cardTransform';

// localStorage key for persisting guest's private game state
const GUEST_STATE_KEY = 'sorcery-guest-state';

interface GuestPersistedState {
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

  // Threshold management
  adjustThreshold: (player: Player, element: 'air' | 'earth' | 'fire' | 'water', amount: number) => void;

  // Turn management
  startTurn: (player: Player) => void;
  endTurn: () => void;

  // Selection
  hoverCard: (card: CardInstance | null) => void;

  // Avatar placement (avatars are now stored in site.units like other cards)
  placeAvatar: (card: CardInstance, position: BoardPosition) => void;

  // Raise card to top of stack (for click-to-raise)
  raiseUnit: (cardId: string, position: BoardPosition) => void;

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
  // Remove specific card from deck by ID (prevents race condition duplication)
  removeCardFromDeckById: (cardId: string, player: Player, deckType: DeckType) => boolean;

  // Graveyard
  addToGraveyard: (card: CardInstance, player: Player) => void;
  removeFromGraveyard: (cardId: string, player: Player) => CardInstance | null;

  // Collection
  addToCollection: (card: CardInstance, player: Player) => void;
  removeFromCollection: (cardId: string, player: Player) => CardInstance | null;

  // Spell stack (casting zone)
  addToSpellStack: (card: CardInstance, player: Player) => void;
  removeFromSpellStack: (cardId: string, player: Player) => CardInstance | null;
  clearSpellStack: (player: Player) => void;

  // Copy card (creates duplicate with new ID, adds to spell stack)
  copyCard: (card: CardInstance, player: Player) => CardInstance;

  // Attach token to a card
  attachToken: (tokenId: string, targetCardId: string) => void;
  // Detach token from a card (moves to spell stack)
  detachToken: (tokenId: string, hostCardId: string, player: Player) => void;
  // Remove attachment from host card (for drag operations - doesn't place anywhere)
  removeFromAttachments: (tokenId: string, hostCardId: string) => void;

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
    player: Player,
    collectionCards?: CardInstance[]
  ) => void;
  clearDecks: (player: Player) => void;
  // Set decks directly (for multiplayer sync - no shuffle)
  setDecks: (player: Player, siteCards: CardInstance[], spellCards: CardInstance[]) => void;

  // Apply full state (for reconnection sync)
  applyFullState: (state: SerializedGameState) => void;
}

const initialState: GameState = {
  board: createEmptyBoard(),
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
  playerCollection: [],
  opponentCollection: [],
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

      // Auto-increment available mana, total mana, and thresholds when a site is placed
      if (card.owner === 'player') {
        return {
          board: newBoard,
          playerMana: state.playerMana + 1,
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
          opponentMana: state.opponentMana + 1,
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
      // Helper to rotate a card and its attachments
      const rotateWithAttachments = (card: CardInstance): CardInstance => {
        const newRotation = card.rotation === 0 ? 90 : 0;
        return {
          ...card,
          rotation: newRotation,
          attachments: card.attachments?.map((att) => ({ ...att, rotation: newRotation })),
        };
      };

      // Check board (including avatars which are now in site.units)
      const newBoard = state.board.map((row) =>
        row.map((site) => ({
          ...site,
          siteCard: site.siteCard?.id === cardId
            ? rotateWithAttachments(site.siteCard)
            : site.siteCard,
          units: site.units.map((u) =>
            u.id === cardId ? rotateWithAttachments(u) : u
          ),
          underCards: site.underCards.map((u) =>
            u.id === cardId ? rotateWithAttachments(u) : u
          ),
        }))
      );

      // Check vertices
      const newVertices = { ...state.vertices };
      for (const key of Object.keys(newVertices)) {
        newVertices[key] = newVertices[key].map((u) =>
          u.id === cardId ? rotateWithAttachments(u) : u
        );
      }

      return { board: newBoard, vertices: newVertices };
    });
  },

  untapAllCards: (player) => {
    set((state) => {
      // Helper to untap a card and its attachments
      const untapWithAttachments = (card: CardInstance): CardInstance => ({
        ...card,
        rotation: 0,
        attachments: card.attachments?.map((att) => ({ ...att, rotation: 0 })),
      });

      const newBoard = state.board.map((row) =>
        row.map((site) => ({
          ...site,
          siteCard: site.siteCard?.owner === player
            ? untapWithAttachments(site.siteCard)
            : site.siteCard,
          units: site.units.map((u) =>
            u.owner === player ? untapWithAttachments(u) : u
          ),
          underCards: site.underCards.map((u) =>
            u.owner === player ? untapWithAttachments(u) : u
          ),
        }))
      );

      const newVertices = { ...state.vertices };
      for (const key of Object.keys(newVertices)) {
        newVertices[key] = newVertices[key].map((u) =>
          u.owner === player ? untapWithAttachments(u) : u
        );
      }

      return { board: newBoard, vertices: newVertices };
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

      // Check board (including avatars)
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

      // Check vertices
      const newVertices = { ...state.vertices };
      for (const key of Object.keys(newVertices)) {
        newVertices[key] = newVertices[key].map((u) =>
          u.id === cardId ? updateCounter(u) : u
        );
      }

      return { board: newBoard, vertices: newVertices };
    });
  },

  flipCard: (cardId) => {
    set((state) => {
      // Helper to toggle faceDown on a card
      const toggleFaceDown = (card: CardInstance): CardInstance => {
        return { ...card, faceDown: !card.faceDown };
      };

      // Check board (including avatars)
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

      // Check vertices
      const newVertices = { ...state.vertices };
      for (const key of Object.keys(newVertices)) {
        newVertices[key] = newVertices[key].map((u) =>
          u.id === cardId ? toggleFaceDown(u) : u
        );
      }

      return { board: newBoard, vertices: newVertices };
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

      const newVertices = { ...state.vertices };
      for (const key of Object.keys(newVertices)) {
        newVertices[key] = newVertices[key].map((u) =>
          u.owner === player ? { ...u, rotation: 0 } : u
        );
      }

      // Reset available mana to total
      return {
        board: newBoard,
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

  hoverCard: (card) => set({ hoveredCard: card }),

  // Place avatar in site.units (avatars are now stored like regular units)
  placeAvatar: (card, position) => {
    set((state) => {
      const newBoard = [...state.board.map((row) => [...row.map((site) => ({ ...site, units: [...site.units] }))])];
      newBoard[position.row][position.col].units.push(card);
      return { board: newBoard };
    });
  },

  raiseUnit: (cardId, position) => {
    set((state) => {
      const newBoard = [...state.board.map((row) => [...row.map((site) => ({ ...site, units: [...site.units] }))])];
      const site = newBoard[position.row][position.col];
      const unitIndex = site.units.findIndex((u) => u.id === cardId);

      // Only raise if found and not already on top
      if (unitIndex === -1 || unitIndex === site.units.length - 1) {
        return state;
      }

      const [unit] = site.units.splice(unitIndex, 1);
      site.units.push(unit);

      return { board: newBoard };
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

  removeCardFromDeckById: (cardId, player, deckType) => {
    const state = useGameStore.getState();
    const deckKey = `${player}${deckType === 'site' ? 'Site' : 'Spell'}Deck` as keyof GameState;
    const deck = state[deckKey] as CardInstance[];

    const index = deck.findIndex((c) => c.id === cardId);
    if (index === -1) return false;

    set(() => {
      const currentDeck = [...(useGameStore.getState()[deckKey] as CardInstance[])];
      // Re-check in case state changed
      const currentIndex = currentDeck.findIndex((c) => c.id === cardId);
      if (currentIndex === -1) return {};
      currentDeck.splice(currentIndex, 1);
      return { [deckKey]: currentDeck };
    });

    return true;
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

  // Collection
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

  copyCard: (card, player) => {
    const copy: CardInstance = {
      ...card,
      id: generateCardId(player),
    };
    // Add copy to spell stack
    set((state) => ({
      playerSpellStack: player === 'player' ? [...state.playerSpellStack, copy] : state.playerSpellStack,
      opponentSpellStack: player === 'opponent' ? [...state.opponentSpellStack, copy] : state.opponentSpellStack,
    }));
    return copy;
  },

  attachToken: (tokenId, targetCardId) => {
    set((state) => {
      // Helper to find and remove token from a location, returning it
      let token: CardInstance | null = null;

      // Check spell stacks
      let playerSpellStack = [...state.playerSpellStack];
      let opponentSpellStack = [...state.opponentSpellStack];
      const playerIdx = playerSpellStack.findIndex((c) => c.id === tokenId);
      if (playerIdx !== -1) {
        [token] = playerSpellStack.splice(playerIdx, 1);
      } else {
        const opponentIdx = opponentSpellStack.findIndex((c) => c.id === tokenId);
        if (opponentIdx !== -1) {
          [token] = opponentSpellStack.splice(opponentIdx, 1);
        }
      }

      // Check hands
      let playerHand = [...state.playerHand];
      let opponentHand = [...state.opponentHand];
      if (!token) {
        const playerHandIdx = playerHand.findIndex((c) => c.id === tokenId);
        if (playerHandIdx !== -1) {
          [token] = playerHand.splice(playerHandIdx, 1);
        } else {
          const opponentHandIdx = opponentHand.findIndex((c) => c.id === tokenId);
          if (opponentHandIdx !== -1) {
            [token] = opponentHand.splice(opponentHandIdx, 1);
          }
        }
      }

      // Helper to remove token from attachments of any card
      const removeFromAttachmentsIfPresent = (card: CardInstance): CardInstance => {
        if (card.attachments) {
          const idx = card.attachments.findIndex((a) => a.id === tokenId);
          if (idx !== -1) {
            const newAttachments = [...card.attachments];
            [token] = newAttachments.splice(idx, 1);
            return { ...card, attachments: newAttachments.length > 0 ? newAttachments : undefined };
          }
        }
        return card;
      };

      // Check board units if not found in spell stacks
      let newBoard = state.board;
      if (!token) {
        newBoard = state.board.map((row) =>
          row.map((site) => {
            const newSite = { ...site, units: [...site.units] };
            const unitIdx = newSite.units.findIndex((u) => u.id === tokenId);
            if (unitIdx !== -1) {
              [token] = newSite.units.splice(unitIdx, 1);
            }
            return newSite;
          })
        );
      }

      // Check existing attachments on all cards if still not found
      if (!token) {
        newBoard = newBoard.map((row) =>
          row.map((site) => ({
            ...site,
            siteCard: site.siteCard ? removeFromAttachmentsIfPresent(site.siteCard) : null,
            units: site.units.map(removeFromAttachmentsIfPresent),
            underCards: site.underCards.map(removeFromAttachmentsIfPresent),
          }))
        );
      }

      // Check vertices attachments
      let newVertices = { ...state.vertices };
      if (!token) {
        for (const key of Object.keys(newVertices)) {
          newVertices[key] = newVertices[key].map(removeFromAttachmentsIfPresent);
        }
      }

      if (!token) return state; // Token not found

      // Helper to add attachment to a card
      const addAttachment = (card: CardInstance): CardInstance => {
        if (card.id === targetCardId) {
          return { ...card, attachments: [...(card.attachments || []), token!] };
        }
        return card;
      };

      // Update board with attachment added to target (including avatars in units)
      const finalBoard = newBoard.map((row) =>
        row.map((site) => ({
          ...site,
          siteCard: site.siteCard ? addAttachment(site.siteCard) : null,
          units: site.units.map(addAttachment),
          underCards: site.underCards.map(addAttachment),
        }))
      );

      // Apply addAttachment to vertices
      const finalVertices = { ...newVertices };
      for (const key of Object.keys(finalVertices)) {
        finalVertices[key] = finalVertices[key].map(addAttachment);
      }

      return {
        board: finalBoard,
        vertices: finalVertices,
        playerSpellStack,
        opponentSpellStack,
        playerHand,
        opponentHand,
      };
    });
  },

  detachToken: (tokenId, hostCardId, player) => {
    set((state) => {
      let token: CardInstance | null = null;

      // Helper to remove attachment from a card
      const removeAttachment = (card: CardInstance): CardInstance => {
        if (card.id === hostCardId && card.attachments) {
          const idx = card.attachments.findIndex((a) => a.id === tokenId);
          if (idx !== -1) {
            const newAttachments = [...card.attachments];
            [token] = newAttachments.splice(idx, 1);
            return { ...card, attachments: newAttachments.length > 0 ? newAttachments : undefined };
          }
        }
        return card;
      };

      // Update board (including avatars)
      const newBoard = state.board.map((row) =>
        row.map((site) => ({
          ...site,
          siteCard: site.siteCard ? removeAttachment(site.siteCard) : null,
          units: site.units.map(removeAttachment),
          underCards: site.underCards.map(removeAttachment),
        }))
      );

      // Check vertices
      const newVertices = { ...state.vertices };
      for (const key of Object.keys(newVertices)) {
        newVertices[key] = newVertices[key].map(removeAttachment);
      }

      if (!token) return state;

      // Add token to spell stack
      return {
        board: newBoard,
        vertices: newVertices,
        playerSpellStack: player === 'player' ? [...state.playerSpellStack, token] : state.playerSpellStack,
        opponentSpellStack: player === 'opponent' ? [...state.opponentSpellStack, token] : state.opponentSpellStack,
      };
    });
  },

  removeFromAttachments: (tokenId, hostCardId) => {
    set((state) => {
      // Helper to remove attachment from a card
      const removeAttachment = (card: CardInstance): CardInstance => {
        if (card.id === hostCardId && card.attachments) {
          const idx = card.attachments.findIndex((a) => a.id === tokenId);
          if (idx !== -1) {
            const newAttachments = [...card.attachments];
            newAttachments.splice(idx, 1);
            return { ...card, attachments: newAttachments.length > 0 ? newAttachments : undefined };
          }
        }
        return card;
      };

      // Update board (including avatars)
      const newBoard = state.board.map((row) =>
        row.map((site) => ({
          ...site,
          siteCard: site.siteCard ? removeAttachment(site.siteCard) : null,
          units: site.units.map(removeAttachment),
          underCards: site.underCards.map(removeAttachment),
        }))
      );

      // Check vertices
      const newVertices = { ...state.vertices };
      for (const key of Object.keys(newVertices)) {
        newVertices[key] = newVertices[key].map(removeAttachment);
      }

      return {
        board: newBoard,
        vertices: newVertices,
      };
    });
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

  importDeck: (siteCards, spellCards, avatar, player, collectionCards) => {
    set((state) => {
      const siteDeckKey = player === 'player' ? 'playerSiteDeck' : 'opponentSiteDeck';
      const spellDeckKey = player === 'player' ? 'playerSpellDeck' : 'opponentSpellDeck';
      const collectionKey = player === 'player' ? 'playerCollection' : 'opponentCollection';

      const updates: Partial<GameState> = {
        [siteDeckKey]: siteCards,
        [spellDeckKey]: spellCards,
        [collectionKey]: collectionCards || [],
      };

      // Place avatar at starting position in site.units
      if (avatar) {
        const avatarRow = player === 'player' ? 3 : 0;
        const avatarCol = 2;
        const newBoard = [...state.board.map((row) => [...row.map((site) => ({ ...site, units: [...site.units] }))])];
        newBoard[avatarRow][avatarCol].units.push(avatar);
        updates.board = newBoard;
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
      // Clear all units owned by this player from the board (including avatars)
      const newBoard = state.board.map((row) =>
        row.map((site) => ({
          ...site,
          siteCard: site.siteCard?.owner === player ? null : site.siteCard,
          units: site.units.filter((u) => u.owner !== player),
          underCards: site.underCards.filter((u) => u.owner !== player),
        }))
      );

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
          board: newBoard,
          playerSiteDeck: [],
          playerSpellDeck: [],
          playerHand: [],
          playerGraveyard: [],
          playerCollection: [],
          playerSpellStack: [],
          vertices: newVertices,
          playerLife: 20,
          playerMana: 0,
          playerManaTotal: 0,
          playerThresholds: { air: 0, earth: 0, fire: 0, water: 0 },
        };
      } else {
        return {
          board: newBoard,
          opponentSiteDeck: [],
          opponentSpellDeck: [],
          opponentHand: [],
          opponentGraveyard: [],
          opponentCollection: [],
          opponentSpellStack: [],
          vertices: newVertices,
          opponentLife: 20,
          opponentMana: 0,
          opponentManaTotal: 0,
          opponentThresholds: { air: 0, earth: 0, fire: 0, water: 0 },
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
      hoveredCard: null,
      hoveredDeck: null,
      shufflingDeck: null,
    }));
  },
}));
