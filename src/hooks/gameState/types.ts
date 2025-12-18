import { StoreApi } from 'zustand';
import { GameState, BoardPosition, CardInstance, Player, DeckType } from '../../types';
import { SerializedGameState } from '../../types/multiplayer';

// Type aliases for slice creators
export type GameStore = GameState & GameActions;
export type SetState = StoreApi<GameStore>['setState'];
export type GetState = StoreApi<GameStore>['getState'];

// Slice creator function type
export type ActionSlice<T> = (set: SetState, get: GetState) => T;

// Full GameActions interface - defines all actions the store exposes
export interface GameActions {
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
  setCurrentTurn: (player: Player) => void;

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

  // Harbinger markers
  setHarbingerMarkers: (positions: string[]) => void;
  clearHarbingerMarkers: () => void;
}
