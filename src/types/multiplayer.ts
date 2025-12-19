import { CardData, CardInstance } from './card';
import { GameState, Player, DeckType } from './game';

// Connection states
export type ConnectionStatus =
  | 'disconnected'
  | 'initializing'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

// Game action types that can be synced
export interface GameAction {
  name: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

// Serializable game state for sync (excludes UI-only state)
export interface SerializedGameState {
  board: GameState['board'];
  vertices: GameState['vertices'];
  playerHand: CardInstance[];
  opponentHand: CardInstance[];
  playerSiteDeck: CardInstance[];
  playerSpellDeck: CardInstance[];
  opponentSiteDeck: CardInstance[];
  opponentSpellDeck: CardInstance[];
  playerGraveyard: CardInstance[];
  opponentGraveyard: CardInstance[];
  playerSpellStack: CardInstance[];
  opponentSpellStack: CardInstance[];
  playerIsMagician?: boolean;
  opponentIsMagician?: boolean;
  playerLife: number;
  opponentLife: number;
  playerMana: number;
  playerManaTotal: number;
  opponentMana: number;
  opponentManaTotal: number;
  playerThresholds: GameState['playerThresholds'];
  opponentThresholds: GameState['opponentThresholds'];
  currentTurn: Player;
  turnNumber: number;
}

// Message types for P2P communication
export type GameMessage =
  // Connection handshake
  | { type: 'hello'; nickname: string; peerId: string }
  | { type: 'game_start'; hostGoesFirst: boolean; nickname?: string }
  | { type: 'rematch_request' }
  | { type: 'rematch_accept' }
  | { type: 'concede' }

  // State synchronization
  | { type: 'full_sync'; state: SerializedGameState; sequence: number }
  | { type: 'action'; action: GameAction; sequence: number }
  | { type: 'ack'; sequence: number }

  // Turn management
  | { type: 'end_turn' }

  // Drag visualization
  | { type: 'drag_start'; cardId: string; cardData?: CardData; from: string }
  | { type: 'drag_move'; x: number; y: number }
  | { type: 'drag_end'; to: string | null }

  // Chat and rolls
  | { type: 'chat'; message: string; timestamp: number }
  | { type: 'roll'; max: number; result: number; nickname: string; timestamp: number }

  // Deck import notification
  | { type: 'deck_imported'; player: Player; deckType: DeckType; cardCount: number }

  // Deck search indicator
  | { type: 'searching_deck'; player: Player; deckType: DeckType; searching: boolean; count?: number }

  // Hand reveal
  | { type: 'reveal_hand'; cards: CardInstance[]; nickname: string }

  // Ping indicator
  | { type: 'ping'; x: number; y: number }

  // Dice roll for turn order
  | { type: 'dice_roll_start' }
  | { type: 'dice_roll_result'; result: number }
  | { type: 'turn_choice'; startsFirst: boolean }

  // Harbinger special dice roll
  | { type: 'harbinger_dice_start'; player: Player }
  | { type: 'harbinger_dice_result'; rolls: number[]; positions: string[] };

// Game log entry
export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'action' | 'chat' | 'system' | 'roll';
  player: Player | null;
  nickname: string | null;
  message: string;
}

// Saved game for resume functionality
export interface SavedGame {
  id: string;
  gameCode: string;
  opponentPeerId: string;
  opponentNickname: string;
  gameState: SerializedGameState;
  localPlayer: Player;
  lastActivity: number;
  status: 'disconnected' | 'abandoned';
}

// Opponent drag state for visualization
export interface OpponentDragState {
  cardId: string;
  cardData?: CardData; // undefined for cards from hidden zones (hand)
  x: number;
  y: number;
}

// Ping state for visualization
export interface PingState {
  x: number;
  y: number;
  timestamp: number;
  isLocal: boolean;
}

// Opponent deck search state for visualization
export interface OpponentSearchState {
  player: Player;
  deckType: DeckType;
  count?: number;
}

// Revealed hand state for visualization
export interface RevealedHandState {
  cards: CardInstance[];
  nickname: string;
}

// Dice roll state for turn order determination
export type DiceRollPhase = 'waiting' | 'rolling' | 'choosing' | 'complete' | null;

export interface DiceRollState {
  phase: DiceRollPhase;
  myRoll: number | null;
  opponentRoll: number | null;
  winner: 'me' | 'opponent' | 'tie' | null;
}

// Harbinger dice roll state
export type HarbingerDicePhase = 'rolling' | 'complete';

export interface HarbingerDiceState {
  phase: HarbingerDicePhase;
  initiator: Player; // Which player imported the Harbinger deck
  rolls: number[]; // Accumulated roll results (0-3 values)
  positions: string[]; // Position keys for markers
  isLocalInitiator: boolean; // Whether local player is the one rolling
}

// Public game listing for matchmaking
export interface PublicGame {
  gameCode: string;
  hostNickname: string;
  waitTimeSeconds: number;
}

// Active game listing for spectator view
export interface ActiveGame {
  gameCode: string;
  hostNickname: string | null;
  guestNickname: string | null;
  playTimeSeconds: number;
}

// Multiplayer state
export interface MultiplayerState {
  // Identity
  nickname: string;

  // Connection
  myPeerId: string | null;
  opponentPeerId: string | null;
  opponentNickname: string | null;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  isHost: boolean;
  isPublicGame: boolean;
  gameCode: string | null;

  // Perspective - which side the local player controls
  localPlayer: Player;

  // Sync tracking
  lastSequence: number;
  pendingAcks: Set<number>;

  // Opponent drag visualization
  opponentDrag: OpponentDragState | null;

  // Opponent deck search visualization
  opponentSearching: OpponentSearchState | null;

  // Revealed hand from opponent
  revealedHand: RevealedHandState | null;

  // Active ping indicator
  activePing: PingState | null;

  // Dice roll for turn order
  diceRollState: DiceRollState | null;

  // Harbinger dice roll state
  harbingerDiceState: HarbingerDiceState | null;

  // In-game log and chat
  gameLog: LogEntry[];

  // Persistence
  savedGames: SavedGame[];

  // Disconnect handling
  disconnectTime: number | null;
  reconnectCountdown: number | null;
}

// Room code generation
export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars (I, O, 0, 1)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Default nickname
export function generateDefaultNickname(): string {
  const adjectives = ['Swift', 'Mighty', 'Arcane', 'Shadow', 'Flame', 'Frost', 'Storm', 'Iron'];
  const nouns = ['Mage', 'Knight', 'Wizard', 'Rogue', 'Sage', 'Hunter', 'Keeper', 'Warden'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}
