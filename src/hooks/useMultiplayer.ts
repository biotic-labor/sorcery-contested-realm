import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { peerService } from '../services/peerService';
import { useGameStore, loadGuestState, saveGuestState, clearGuestState } from './useGameState';
import {
  MultiplayerState,
  GameMessage,
  GameAction,
  LogEntry,
  SavedGame,
  SerializedGameState,
  generateDefaultNickname,
  ConnectionStatus,
  OpponentDragState,
  OpponentSearchState,
  PingState,
} from '../types/multiplayer';
import { Player, CardInstance } from '../types';

// Will be used for disconnect timeout handling in Phase 4
const _DISCONNECT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
void _DISCONNECT_TIMEOUT_MS; // Prevent unused variable error

interface MultiplayerActions {
  // Identity
  setNickname: (nickname: string) => void;

  // Connection
  createGame: () => Promise<string>;
  createPublicGame: () => Promise<string>;
  cancelPublicGame: () => Promise<void>;
  joinGame: (code: string) => Promise<void>;
  disconnect: () => void;

  // Messaging
  sendMessage: (message: GameMessage) => boolean;
  sendChat: (text: string) => void;
  sendRoll: (max: number) => void;
  sendEndTurn: () => void;

  // Game log
  addLogEntry: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLog: () => void;

  // Opponent drag visualization
  setOpponentDrag: (drag: OpponentDragState | null) => void;

  // Opponent deck search visualization
  setOpponentSearching: (search: OpponentSearchState | null) => void;
  sendSearchingDeck: (deckType: 'site' | 'spell', searching: boolean, count?: number) => void;

  // Revealed hand
  clearRevealedHand: () => void;

  // Ping
  sendPing: (x: number, y: number) => void;
  addPing: (ping: PingState) => void;
  clearPing: () => void;

  // State sync
  sendFullSync: () => void;
  broadcastAction: (actionName: string, payload: Record<string, unknown>) => void;

  // Saved games
  saveCurrentGame: () => void;
  loadSavedGame: (gameId: string) => void;
  deleteSavedGame: (gameId: string) => void;

  // Internal
  handleMessage: (message: GameMessage) => void;
  setConnectionStatus: (status: ConnectionStatus, error?: string) => void;
}

// Helper to get serializable game state
function getSerializedGameState(): SerializedGameState {
  const state = useGameStore.getState();
  return {
    board: state.board,
    avatars: state.avatars,
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

// Helper to swap player perspective in state - used in Phase 3/5 for state sync
export function swapPerspective(state: SerializedGameState): SerializedGameState {
  return {
    ...state,
    playerHand: state.opponentHand,
    opponentHand: state.playerHand,
    playerSiteDeck: state.opponentSiteDeck,
    opponentSiteDeck: state.playerSiteDeck,
    playerSpellDeck: state.opponentSpellDeck,
    opponentSpellDeck: state.playerSpellDeck,
    playerGraveyard: state.opponentGraveyard,
    opponentGraveyard: state.playerGraveyard,
    playerSpellStack: state.opponentSpellStack,
    opponentSpellStack: state.playerSpellStack,
    playerLife: state.opponentLife,
    opponentLife: state.playerLife,
    playerMana: state.opponentMana,
    opponentMana: state.playerMana,
    playerManaTotal: state.opponentManaTotal,
    opponentManaTotal: state.playerManaTotal,
    playerThresholds: state.opponentThresholds,
    opponentThresholds: state.playerThresholds,
    currentTurn: state.currentTurn === 'player' ? 'opponent' : 'player',
  };
}

// Generate unique ID for log entries
function generateLogId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Swap player references for remote actions
function swapPlayer(player: Player): Player {
  return player === 'player' ? 'opponent' : 'player';
}

// Create hidden placeholder cards for opponent's deck (we can't see their cards)
function createHiddenCards(count: number, owner: Player, sourceDeck?: 'site' | 'spell'): CardInstance[] {
  const timestamp = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    id: `hidden-${owner}-${sourceDeck || 'deck'}-${i}-${timestamp}`,
    cardData: {
      name: 'Hidden',
      guardian: {
        rarity: 'Ordinary' as const,
        type: 'Minion' as const,
        rulesText: '',
        cost: null,
        attack: null,
        defence: null,
        life: null,
        thresholds: { air: 0, earth: 0, fire: 0, water: 0 },
      },
      elements: '',
      subTypes: '',
      sets: [],
    },
    variant: {
      slug: 'hidden',
      finish: 'Standard' as const,
      product: '',
      artist: '',
      flavorText: '',
      typeText: '',
    },
    rotation: 0,
    owner,
    sourceDeck,
  }));
}

// Apply a remote action from opponent with perspective swap
function applyRemoteAction(
  action: GameAction,
  localPlayer: Player,
  addLogEntry: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void,
  opponentNickname: string
) {
  const gameStore = useGameStore.getState();
  const payload = action.payload;

  // Helper to get opponent's player value for log entries
  const opponentPlayer = localPlayer === 'player' ? 'opponent' : 'player';

  // When we receive an action, the opponent's "player" is our "opponent"
  // So we need to swap player references
  const needsSwap = localPlayer === 'opponent';

  switch (action.name) {
    case 'placeCardOnSite': {
      // DO NOT swap owner - card ownership is canonical for rotation logic
      const card = payload.card as CardInstance;
      const position = payload.position as { row: number; col: number };
      gameStore.placeCardOnSite(card, position);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `placed ${card.cardData?.name || 'a card'} on grid ${position.row * 5 + position.col + 1}`,
      });
      break;
    }
    case 'placeUnitOnSite': {
      // DO NOT swap owner - card ownership is canonical for rotation logic
      const card = payload.card as CardInstance;
      const position = payload.position as { row: number; col: number };
      gameStore.placeUnitOnSite(card, position);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `placed ${card.cardData?.name || 'a card'} on grid ${position.row * 5 + position.col + 1}`,
      });
      break;
    }
    case 'placeUnitOnVertex': {
      // DO NOT swap owner - card ownership is canonical for rotation logic
      const card = payload.card as CardInstance;
      const vertexKey = payload.vertexKey as string;
      gameStore.placeUnitOnVertex(card, vertexKey);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `placed ${card.cardData?.name || 'a card'} at vertex ${vertexKey}`,
      });
      break;
    }
    case 'moveCard': {
      const { cardId, from, to } = payload as { cardId: string; from: { row: number; col: number }; to: { row: number; col: number } };
      gameStore.moveCard(cardId, from, to);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `moved a card from grid ${from.row * 5 + from.col + 1} to ${to.row * 5 + to.col + 1}`,
      });
      break;
    }
    case 'moveAvatar': {
      const { cardId, from, to } = payload as { cardId: string; from: { row: number; col: number }; to: { row: number; col: number } };
      gameStore.moveAvatar(cardId, from, to);
      break;
    }
    case 'rotateCard': {
      gameStore.rotateCard(payload.cardId as string);
      break;
    }
    case 'toggleCardUnder': {
      gameStore.toggleCardUnder(payload.cardId as string);
      break;
    }
    case 'adjustCardCounter': {
      gameStore.adjustCardCounter(payload.cardId as string, payload.amount as number);
      break;
    }
    case 'flipCard': {
      gameStore.flipCard(payload.cardId as string);
      break;
    }
    case 'addToHand': {
      // DO NOT swap - data should go in same slot on both clients
      const card = payload.card as CardInstance;
      const player = payload.player as Player;
      gameStore.addToHand(card, player);
      break;
    }
    case 'removeFromHand': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      const cardId = payload.cardId as string;
      const sourceDeck = payload.sourceDeck as 'site' | 'spell' | undefined;
      const hand = player === 'player' ? gameStore.playerHand : gameStore.opponentHand;

      // Try to find card by ID first
      const hasCard = hand.some(c => c.id === cardId);
      if (hasCard) {
        gameStore.removeFromHand(cardId, player);
      } else if (hand.length > 0) {
        // Card ID not found (hidden cards have different IDs)
        // Find a hidden card matching the source deck type
        const hiddenCard = sourceDeck
          ? hand.find(c => c.id.startsWith('hidden-') && c.sourceDeck === sourceDeck)
          : hand.find(c => c.id.startsWith('hidden-'));
        if (hiddenCard) {
          gameStore.removeFromHand(hiddenCard.id, player);
        }
      }
      break;
    }
    case 'reorderHand': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      gameStore.reorderHand(player, payload.fromIndex as number, payload.toIndex as number);
      break;
    }
    case 'removeCardFromBoard': {
      gameStore.removeCardFromBoard(payload.cardId as string, payload.position as { row: number; col: number });
      break;
    }
    case 'removeCardFromVertex': {
      gameStore.removeCardFromVertex(payload.cardId as string, payload.vertexKey as string);
      break;
    }
    case 'adjustLife': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      const amount = payload.amount as number;
      gameStore.adjustLife(player, amount);
      const currentLife = useGameStore.getState()[player === 'player' ? 'playerLife' : 'opponentLife'];
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `life ${amount >= 0 ? '+' : ''}${amount} (now ${currentLife})`,
      });
      break;
    }
    case 'adjustMana': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      const amount = payload.amount as number;
      gameStore.adjustMana(player, amount);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `mana ${amount >= 0 ? '+' : ''}${amount}`,
      });
      break;
    }
    case 'adjustManaTotal': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      const amount = payload.amount as number;
      gameStore.adjustManaTotal(player, amount);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `max mana ${amount >= 0 ? '+' : ''}${amount}`,
      });
      break;
    }
    case 'shuffleDeck': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      const deckType = payload.deckType as 'site' | 'spell';
      gameStore.shuffleDeck(player, deckType);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `shuffled their ${deckType} deck`,
      });
      break;
    }
    case 'drawCards': {
      // DO NOT swap - data should go in same slot on both clients
      // UI perspective mapping handles showing correct hand in correct position
      const player = payload.player as Player;
      const deckType = payload.deckType as 'site' | 'spell';
      const count = payload.count as number;
      gameStore.drawCards(player, deckType, count);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `drew ${count} card${count !== 1 ? 's' : ''} from ${deckType} deck`,
      });
      break;
    }
    case 'putCardOnTop': {
      // DO NOT swap - data should go in same slot on both clients
      const card = payload.card as CardInstance;
      const player = payload.player as Player;
      gameStore.putCardOnTop(card, player, payload.deckType as 'site' | 'spell');
      break;
    }
    case 'putCardOnBottom': {
      // DO NOT swap - data should go in same slot on both clients
      const card = payload.card as CardInstance;
      const player = payload.player as Player;
      gameStore.putCardOnBottom(card, player, payload.deckType as 'site' | 'spell');
      break;
    }
    case 'returnCardsToDeck': {
      // DO NOT swap - data should go in same slot on both clients
      const cards = payload.cards as CardInstance[];
      const player = payload.player as Player;
      const deckType = payload.deckType as 'site' | 'spell';
      const position = payload.position as 'top' | 'bottom';
      gameStore.returnCardsToDeck(cards, player, deckType, position);
      break;
    }
    case 'removeTopCardFromDeck': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      const deckType = payload.deckType as 'site' | 'spell';
      gameStore.removeTopCardFromDeck(player, deckType);
      break;
    }
    case 'addToGraveyard': {
      // DO NOT swap - data should go in same slot on both clients
      const card = payload.card as CardInstance;
      const player = payload.player as Player;
      gameStore.addToGraveyard(card, player);
      break;
    }
    case 'removeFromGraveyard': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      gameStore.removeFromGraveyard(payload.cardId as string, player);
      break;
    }
    case 'addToSpellStack': {
      // DO NOT swap - data should go in same slot on both clients
      const card = payload.card as CardInstance;
      const player = payload.player as Player;
      gameStore.addToSpellStack(card, player);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `cast ${card.cardData?.name || 'a spell'}`,
      });
      break;
    }
    case 'removeFromSpellStack': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      gameStore.removeFromSpellStack(payload.cardId as string, player);
      break;
    }
    case 'clearSpellStack': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      gameStore.clearSpellStack(player);
      break;
    }
    case 'placeAvatar': {
      const card = payload.card as CardInstance;
      const adjustedCard = needsSwap ? { ...card, owner: swapPlayer(card.owner) } : card;
      gameStore.placeAvatar(adjustedCard, payload.position as { row: number; col: number });
      break;
    }
    case 'deckImported': {
      const siteDeckCount = payload.siteDeckCount as number;
      const spellDeckCount = payload.spellDeckCount as number;
      const avatar = payload.avatar as CardInstance | null;
      const avatarPosition = payload.avatarPosition as { row: number; col: number } | null;
      const sourcePlayer = payload.player as Player;

      // DO NOT swap player - data should go in same slot on both clients
      // Host's deck -> playerSiteDeck, Guest's deck -> opponentSiteDeck
      // UI perspective mapping handles showing correct deck in correct position
      const targetPlayer = sourcePlayer;

      // Place avatar at the SAME canonical position the sender used
      if (avatar && avatarPosition) {
        // Avatar owner matches the player who imported (no swap needed)
        gameStore.placeAvatar(avatar, avatarPosition);
      }

      // Create hidden placeholder cards for opponent's decks (with deck type for card back display)
      const hiddenSiteCards = createHiddenCards(siteDeckCount, targetPlayer, 'site');
      const hiddenSpellCards = createHiddenCards(spellDeckCount, targetPlayer, 'spell');
      gameStore.setDecks(targetPlayer, hiddenSiteCards, hiddenSpellCards);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: 'imported their deck',
      });
      break;
    }
    case 'startTurn': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      gameStore.startTurn(player);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: 'started their turn',
      });
      break;
    }
    default:
      console.warn('Unknown remote action:', action.name);
  }
}

export const useMultiplayerStore = create<MultiplayerState & MultiplayerActions>()(
  persist(
    (set, get) => ({
      // Initial state
      nickname: generateDefaultNickname(),
      myPeerId: null,
      opponentPeerId: null,
      opponentNickname: null,
      connectionStatus: 'disconnected',
      connectionError: null,
      isHost: false,
      isPublicGame: false,
      gameCode: null,
      localPlayer: 'player',
      lastSequence: 0,
      pendingAcks: new Set<number>(),
      opponentDrag: null,
      opponentSearching: null,
      revealedHand: null,
      activePing: null,
      gameLog: [],
      savedGames: [],
      disconnectTime: null,
      reconnectCountdown: null,

      // Actions
      setNickname: (nickname) => {
        set({ nickname });
      },

      createGame: async () => {
        set({ connectionStatus: 'initializing', connectionError: null });

        peerService.setOnPeerReady((peerId) => {
          set({ myPeerId: peerId, connectionStatus: 'waiting' });
        });

        peerService.setOnConnected(() => {
          const state = get();
          const gameState = useGameStore.getState();

          // Check if game state exists (this is a reconnection)
          // Include turnNumber > 1 to catch late-game scenarios where decks/board may be empty
          const hasGameState =
            gameState.turnNumber > 1 ||
            gameState.playerSiteDeck.length > 0 ||
            gameState.opponentSiteDeck.length > 0 ||
            gameState.playerHand.length > 0 ||
            gameState.opponentHand.length > 0 ||
            gameState.playerGraveyard.length > 0 ||
            gameState.opponentGraveyard.length > 0 ||
            gameState.board.some((row) =>
              row.some((cell) => cell.siteCard || cell.units.length > 0)
            );

          set({
            connectionStatus: 'connected',
            opponentPeerId: peerService.getOpponentPeerId(),
            disconnectTime: null,
          });

          // Send hello message
          peerService.send({
            type: 'hello',
            nickname: state.nickname,
            peerId: state.myPeerId!,
          });

          // If this is a reconnection, sync the full game state to the returning guest
          if (hasGameState) {
            get().sendFullSync();
            get().addLogEntry({
              type: 'system',
              player: null,
              nickname: null,
              message: 'Opponent reconnected',
            });
          }
        });

        peerService.setOnMessage((message) => {
          get().handleMessage(message);
        });

        peerService.setOnDisconnected(() => {
          set({
            connectionStatus: 'disconnected',
            disconnectTime: Date.now(),
          });
          get().addLogEntry({
            type: 'system',
            player: null,
            nickname: null,
            message: 'Opponent disconnected',
          });
        });

        peerService.setOnError((error) => {
          set({
            connectionStatus: 'error',
            connectionError: error.message,
          });
        });

        try {
          const code = await peerService.createGame();
          set({ gameCode: code, isHost: true, localPlayer: 'player' });

          // Register game with server for reconnection support
          const peerId = get().myPeerId;
          if (peerId) {
            registerGameWithServer(code, peerId);
          }

          // Set up auto-save to server
          setupHostStateAutoSave(code);

          get().addLogEntry({
            type: 'system',
            player: null,
            nickname: null,
            message: `Game created. Code: ${code}`,
          });

          return code;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create game';
          set({ connectionStatus: 'error', connectionError: message });
          throw error;
        }
      },

      createPublicGame: async () => {
        set({ connectionStatus: 'initializing', connectionError: null });

        peerService.setOnPeerReady((peerId) => {
          set({ myPeerId: peerId, connectionStatus: 'waiting' });
        });

        peerService.setOnConnected(() => {
          set({
            connectionStatus: 'connected',
            opponentPeerId: peerService.getOpponentPeerId(),
            disconnectTime: null,
          });

          // Send hello message
          const state = get();
          peerService.send({
            type: 'hello',
            nickname: state.nickname,
            peerId: state.myPeerId!,
          });
        });

        peerService.setOnMessage((message) => {
          get().handleMessage(message);
        });

        peerService.setOnDisconnected(() => {
          set({
            connectionStatus: 'disconnected',
            disconnectTime: Date.now(),
          });
          get().addLogEntry({
            type: 'system',
            player: null,
            nickname: null,
            message: 'Opponent disconnected',
          });
        });

        peerService.setOnError((error) => {
          set({
            connectionStatus: 'error',
            connectionError: error.message,
          });
        });

        try {
          const code = await peerService.createGame();
          set({ gameCode: code, isHost: true, isPublicGame: true, localPlayer: 'player' });

          // Register as public game with server
          const state = get();
          const peerId = state.myPeerId;
          if (peerId) {
            await fetch(`/api/games/${encodeURIComponent(code)}/register-public`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ peerId, nickname: state.nickname }),
            });
          }

          // Set up auto-save to server
          setupHostStateAutoSave(code);

          get().addLogEntry({
            type: 'system',
            player: null,
            nickname: null,
            message: 'Searching for opponent...',
          });

          return code;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create game';
          set({ connectionStatus: 'error', connectionError: message });
          throw error;
        }
      },

      cancelPublicGame: async () => {
        const { gameCode, isPublicGame, connectionStatus } = get();

        // Only cancel if we're a public game waiting for opponent
        if (gameCode && isPublicGame && connectionStatus === 'waiting') {
          try {
            await fetch(`/api/games/${encodeURIComponent(gameCode)}/public`, {
              method: 'DELETE',
            });
          } catch (error) {
            console.error('Failed to remove public game:', error);
          }
        }

        peerService.cleanup();
        cleanupHostStateAutoSave();
        set({
          connectionStatus: 'disconnected',
          opponentPeerId: null,
          opponentNickname: null,
          gameCode: null,
          myPeerId: null,
          isPublicGame: false,
          opponentDrag: null,
        });
      },

      joinGame: async (code) => {
        set({ connectionStatus: 'connecting', connectionError: null });

        peerService.setOnPeerReady((peerId) => {
          set({ myPeerId: peerId });
        });

        peerService.setOnMessage((message) => {
          get().handleMessage(message);
        });

        peerService.setOnDisconnected(() => {
          set({
            connectionStatus: 'disconnected',
            disconnectTime: Date.now(),
          });
          get().addLogEntry({
            type: 'system',
            player: null,
            nickname: null,
            message: 'Opponent disconnected',
          });
        });

        peerService.setOnError((error) => {
          set({
            connectionStatus: 'error',
            connectionError: error.message,
          });
        });

        try {
          await peerService.joinGame(code);
          set({
            gameCode: code,
            isHost: false,
            localPlayer: 'opponent',
            connectionStatus: 'connected',
            opponentPeerId: code, // Host's peer ID is the game code
          });

          // Set up auto-save for guest's private state
          setupGuestStateAutoSave(code);

          // Register guest with server for reconnection support
          const peerId = get().myPeerId;
          if (peerId) {
            registerGuestWithServer(code, peerId);
          }

          // Send hello message
          const state = get();
          peerService.send({
            type: 'hello',
            nickname: state.nickname,
            peerId: state.myPeerId!,
          });

          get().addLogEntry({
            type: 'system',
            player: null,
            nickname: null,
            message: `Joined game ${code}`,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to join game';
          set({ connectionStatus: 'error', connectionError: message });
          throw error;
        }
      },

      disconnect: () => {
        peerService.cleanup();
        cleanupGuestStateAutoSave();
        cleanupHostStateAutoSave();
        set({
          connectionStatus: 'disconnected',
          opponentPeerId: null,
          opponentNickname: null,
          gameCode: null,
          myPeerId: null,
          isPublicGame: false,
          opponentDrag: null,
        });
      },

      sendMessage: (message) => {
        return peerService.send(message);
      },

      sendChat: (text) => {
        const state = get();
        const timestamp = Date.now();

        const message: GameMessage = {
          type: 'chat',
          message: text,
          timestamp,
        };

        if (peerService.send(message)) {
          state.addLogEntry({
            type: 'chat',
            player: state.localPlayer,
            nickname: state.nickname,
            message: text,
          });
        }
      },

      sendRoll: (max) => {
        const state = get();
        const result = Math.floor(Math.random() * max) + 1;
        const timestamp = Date.now();

        const message: GameMessage = {
          type: 'roll',
          max,
          result,
          nickname: state.nickname,
          timestamp,
        };

        if (peerService.send(message)) {
          state.addLogEntry({
            type: 'roll',
            player: state.localPlayer,
            nickname: state.nickname,
            message: `rolled ${result} (d${max})`,
          });
        }
      },

      sendEndTurn: () => {
        const gameStore = useGameStore.getState();
        gameStore.endTurn();

        peerService.send({ type: 'end_turn' });

        get().addLogEntry({
          type: 'system',
          player: get().localPlayer,
          nickname: get().nickname,
          message: 'ended their turn',
        });
      },

      addLogEntry: (entry) => {
        const logEntry: LogEntry = {
          ...entry,
          id: generateLogId(),
          timestamp: Date.now(),
        };
        set((state) => ({
          gameLog: [...state.gameLog, logEntry],
        }));
      },

      clearLog: () => {
        set({ gameLog: [] });
      },

      setOpponentDrag: (drag) => {
        set({ opponentDrag: drag });
      },

      setOpponentSearching: (search) => {
        set({ opponentSearching: search });
      },

      sendSearchingDeck: (deckType, searching, count) => {
        const state = get();
        const message: GameMessage = {
          type: 'searching_deck',
          player: state.localPlayer,
          deckType,
          searching,
          count,
        };
        peerService.send(message);
      },

      clearRevealedHand: () => {
        set({ revealedHand: null });
      },

      sendPing: (xPercent, yPercent) => {
        // Convert percentages to screen coords for local display
        const board = document.querySelector('[data-board-grid]');
        if (!board) return;
        const rect = board.getBoundingClientRect();
        const screenX = rect.left + xPercent * rect.width;
        const screenY = rect.top + yPercent * rect.height;

        const ping: PingState = {
          x: screenX,
          y: screenY,
          timestamp: Date.now(),
          isLocal: true,
        };
        set({ activePing: ping });
        peerService.send({ type: 'ping', x: xPercent, y: yPercent });
        // Auto-clear after animation duration
        setTimeout(() => {
          set((s) => (s.activePing?.timestamp === ping.timestamp ? { activePing: null } : s));
        }, 1500);
      },

      addPing: (ping) => {
        set({ activePing: ping });
        // Auto-clear after animation duration
        setTimeout(() => {
          set((s) => (s.activePing?.timestamp === ping.timestamp ? { activePing: null } : s));
        }, 1500);
      },

      clearPing: () => {
        set({ activePing: null });
      },

      sendFullSync: () => {
        const state = get();
        const gameState = getSerializedGameState();

        const message: GameMessage = {
          type: 'full_sync',
          state: gameState,
          sequence: state.lastSequence + 1,
        };

        set({ lastSequence: state.lastSequence + 1 });
        peerService.send(message);
      },

      broadcastAction: (actionName, payload) => {
        const state = get();
        const sequence = state.lastSequence + 1;

        const message: GameMessage = {
          type: 'action',
          action: {
            name: actionName,
            payload,
            timestamp: Date.now(),
          },
          sequence,
        };

        set({
          lastSequence: sequence,
          pendingAcks: new Set([...state.pendingAcks, sequence]),
        });

        peerService.send(message);
      },

      saveCurrentGame: () => {
        const state = get();
        if (!state.gameCode || !state.opponentPeerId) return;

        const savedGame: SavedGame = {
          id: `${state.gameCode}-${Date.now()}`,
          gameCode: state.gameCode,
          opponentPeerId: state.opponentPeerId,
          opponentNickname: state.opponentNickname || 'Unknown',
          gameState: getSerializedGameState(),
          localPlayer: state.localPlayer,
          lastActivity: Date.now(),
          status: 'disconnected',
        };

        set((s) => ({
          savedGames: [
            savedGame,
            ...s.savedGames.filter((g) => g.gameCode !== state.gameCode),
          ],
        }));
      },

      loadSavedGame: (gameId) => {
        const state = get();
        const savedGame = state.savedGames.find((g) => g.id === gameId);
        if (!savedGame) return;

        // Apply saved game state - full implementation in Phase 5
        const gameStore = useGameStore.getState();
        gameStore.resetGame();
        // TODO: Apply each field from savedGame.gameState with perspective swap
        set({ localPlayer: savedGame.localPlayer });
      },

      deleteSavedGame: (gameId) => {
        set((state) => ({
          savedGames: state.savedGames.filter((g) => g.id !== gameId),
        }));
      },

      handleMessage: (message) => {
        const state = get();
        const gameStore = useGameStore.getState();

        switch (message.type) {
          case 'hello':
            set({ opponentNickname: message.nickname });
            state.addLogEntry({
              type: 'system',
              player: null,
              nickname: null,
              message: `${message.nickname} connected`,
            });

            // If we're the host, send game_start with nickname
            if (state.isHost) {
              peerService.send({
                type: 'game_start',
                hostGoesFirst: true,
                nickname: state.nickname,
              });
            }
            break;

          case 'game_start':
            // Set opponent nickname from host (in case hello message was missed)
            if (message.nickname) {
              set({ opponentNickname: message.nickname });
            }
            state.addLogEntry({
              type: 'system',
              player: null,
              nickname: null,
              message: message.hostGoesFirst
                ? 'Host goes first'
                : 'Guest goes first',
            });
            break;

          case 'chat':
            state.addLogEntry({
              type: 'chat',
              player: state.localPlayer === 'player' ? 'opponent' : 'player',
              nickname: state.opponentNickname,
              message: message.message,
            });
            break;

          case 'roll':
            state.addLogEntry({
              type: 'roll',
              player: state.localPlayer === 'player' ? 'opponent' : 'player',
              nickname: message.nickname,
              message: `rolled ${message.result} (d${message.max})`,
            });
            break;

          case 'end_turn':
            // Opponent ended their turn, switch turn to local player
            gameStore.endTurn();
            state.addLogEntry({
              type: 'system',
              player: state.localPlayer === 'player' ? 'opponent' : 'player',
              nickname: state.opponentNickname,
              message: 'ended their turn',
            });
            break;

          case 'full_sync': {
            // Only guests should accept full_sync (hosts are authoritative)
            if (state.localPlayer === 'player') {
              // Host received full_sync from guest - ignore (potential cheat attempt)
              console.warn('Ignoring full_sync from guest - host is authoritative');
              break;
            }
            // Guest receives host's state. Try to restore our private data from:
            // 1. Current memory (if we didn't refresh)
            // 2. localStorage (if we refreshed but saved state exists)
            // 3. Fall back to host's data (hidden placeholders)
            const currentState = useGameStore.getState();
            const hasMemoryData =
              currentState.opponentHand.length > 0 ||
              currentState.opponentSiteDeck.length > 0 ||
              currentState.opponentSpellDeck.length > 0;

            // Try localStorage if memory is empty
            const savedState = !hasMemoryData && state.gameCode
              ? loadGuestState(state.gameCode)
              : null;

            const mergedState: SerializedGameState = {
              // Shared board state from host
              board: message.state.board,
              avatars: message.state.avatars,
              vertices: message.state.vertices,
              // Host's data (stored in player* slots)
              playerHand: message.state.playerHand,
              playerSiteDeck: message.state.playerSiteDeck,
              playerSpellDeck: message.state.playerSpellDeck,
              playerGraveyard: message.state.playerGraveyard,
              playerSpellStack: message.state.playerSpellStack || [],
              playerLife: message.state.playerLife,
              playerMana: message.state.playerMana,
              playerManaTotal: message.state.playerManaTotal,
              playerThresholds: message.state.playerThresholds,
              // Guest's own data - memory > localStorage > host's hidden cards
              opponentHand: hasMemoryData
                ? currentState.opponentHand
                : (savedState?.opponentHand ?? message.state.opponentHand),
              opponentSiteDeck: hasMemoryData
                ? currentState.opponentSiteDeck
                : (savedState?.opponentSiteDeck ?? message.state.opponentSiteDeck),
              opponentSpellDeck: hasMemoryData
                ? currentState.opponentSpellDeck
                : (savedState?.opponentSpellDeck ?? message.state.opponentSpellDeck),
              opponentGraveyard: hasMemoryData
                ? currentState.opponentGraveyard
                : (savedState?.opponentGraveyard ?? message.state.opponentGraveyard),
              opponentSpellStack: message.state.opponentSpellStack || [],
              opponentLife: message.state.opponentLife,
              opponentMana: message.state.opponentMana,
              opponentManaTotal: message.state.opponentManaTotal,
              opponentThresholds: message.state.opponentThresholds,
              // Turn state from host
              currentTurn: message.state.currentTurn,
              turnNumber: message.state.turnNumber,
            };
            useGameStore.getState().applyFullState(mergedState);
            peerService.send({ type: 'ack', sequence: message.sequence });
            state.addLogEntry({
              type: 'system',
              player: null,
              nickname: null,
              message: savedState ? 'Game state restored' : 'Game state synchronized',
            });
            break;
          }

          case 'action':
            // Apply action from opponent with perspective swap
            peerService.send({ type: 'ack', sequence: message.sequence });
            applyRemoteAction(message.action, state.localPlayer, state.addLogEntry, state.opponentNickname || 'Opponent');
            break;

          case 'ack':
            set((s) => {
              const newPending = new Set(s.pendingAcks);
              newPending.delete(message.sequence);
              return { pendingAcks: newPending };
            });
            break;

          case 'drag_start':
            set({
              opponentDrag: {
                cardId: message.cardId,
                cardData: message.cardData,
                x: 0,
                y: 0,
              },
            });
            break;

          case 'drag_move':
            set((s) => {
              if (!s.opponentDrag) return s;
              return {
                opponentDrag: {
                  ...s.opponentDrag,
                  x: message.x,
                  y: message.y,
                },
              };
            });
            break;

          case 'drag_end':
            set({ opponentDrag: null });
            break;

          case 'concede':
            state.addLogEntry({
              type: 'system',
              player: null,
              nickname: state.opponentNickname,
              message: 'conceded the game',
            });
            break;

          case 'rematch_request':
            state.addLogEntry({
              type: 'system',
              player: null,
              nickname: state.opponentNickname,
              message: 'requested a rematch',
            });
            break;

          case 'rematch_accept':
            state.addLogEntry({
              type: 'system',
              player: null,
              nickname: null,
              message: 'Rematch accepted. Starting new game...',
            });
            gameStore.resetGame();
            break;

          case 'searching_deck':
            if (message.searching) {
              set({
                opponentSearching: {
                  player: message.player,
                  deckType: message.deckType,
                  count: message.count,
                },
              });
            } else {
              set({ opponentSearching: null });
            }
            break;

          case 'reveal_hand':
            set({
              revealedHand: {
                cards: message.cards,
                nickname: message.nickname,
              },
            });
            state.addLogEntry({
              type: 'action',
              player: state.localPlayer === 'player' ? 'opponent' : 'player',
              nickname: message.nickname,
              message: 'revealed their hand',
            });
            break;

          case 'ping': {
            // Message contains board-relative percentages (0-1)
            // Mirror them since opponent's board is rotated 180 degrees
            const xPercent = 1 - message.x;
            const yPercent = 1 - message.y;

            // Convert to screen coords using local board position
            const board = document.querySelector('[data-board-grid]');
            if (!board) break;
            const rect = board.getBoundingClientRect();
            const screenX = rect.left + xPercent * rect.width;
            const screenY = rect.top + yPercent * rect.height;

            const ping: PingState = {
              x: screenX,
              y: screenY,
              timestamp: Date.now(),
              isLocal: false,
            };
            get().addPing(ping);
            break;
          }
        }
      },

      setConnectionStatus: (status, error) => {
        set({
          connectionStatus: status,
          connectionError: error || null,
        });
      },
    }),
    {
      name: 'sorcery-multiplayer',
      partialize: (state) => ({
        nickname: state.nickname,
        savedGames: state.savedGames,
      }),
    }
  )
);

// Track subscription for guest state auto-save
let guestStateSaveUnsubscribe: (() => void) | null = null;

// Set up auto-save for guest's private state
function setupGuestStateAutoSave(gameCode: string): void {
  // Clean up any existing subscription
  if (guestStateSaveUnsubscribe) {
    guestStateSaveUnsubscribe();
  }

  // Subscribe to game store changes and save guest's private data
  guestStateSaveUnsubscribe = useGameStore.subscribe((state, prevState) => {
    // Only save if guest's private data changed
    if (
      state.opponentHand !== prevState.opponentHand ||
      state.opponentSiteDeck !== prevState.opponentSiteDeck ||
      state.opponentSpellDeck !== prevState.opponentSpellDeck ||
      state.opponentGraveyard !== prevState.opponentGraveyard
    ) {
      saveGuestState(gameCode, state);
    }
  });
}

// Clean up guest state subscription
function cleanupGuestStateAutoSave(): void {
  if (guestStateSaveUnsubscribe) {
    guestStateSaveUnsubscribe();
    guestStateSaveUnsubscribe = null;
  }
  clearGuestState();
}

// Server state save for reconnection support
let serverStateSaveTimer: ReturnType<typeof setTimeout> | null = null;
let serverStateSaveUnsubscribe: (() => void) | null = null;

async function registerGameWithServer(gameCode: string, peerId: string): Promise<void> {
  try {
    await fetch(`/api/games/${encodeURIComponent(gameCode)}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId }),
    });
  } catch (error) {
    console.error('Failed to register game with server:', error);
  }
}

async function registerGuestWithServer(gameCode: string, peerId: string): Promise<void> {
  try {
    await fetch(`/api/games/${encodeURIComponent(gameCode)}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId }),
    });
  } catch (error) {
    console.error('Failed to register guest with server:', error);
  }
}

async function saveStateToServer(gameCode: string): Promise<void> {
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

function setupHostStateAutoSave(gameCode: string): void {
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

function cleanupHostStateAutoSave(): void {
  if (serverStateSaveUnsubscribe) {
    serverStateSaveUnsubscribe();
    serverStateSaveUnsubscribe = null;
  }
  if (serverStateSaveTimer) {
    clearTimeout(serverStateSaveTimer);
    serverStateSaveTimer = null;
  }
}

// Hook to check if it's the local player's turn
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

// Hook to get the effective player identity
export function useLocalPlayer(): Player {
  return useMultiplayerStore((s) => s.localPlayer);
}
