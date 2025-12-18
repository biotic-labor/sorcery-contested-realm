import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { peerService } from '../../services/peerService';
import { useGameStore, loadGuestState } from '../useGameState';
import {
  MultiplayerState,
  GameMessage,
  LogEntry,
  SavedGame,
  SerializedGameState,
  generateDefaultNickname,
  ConnectionStatus,
  OpponentDragState,
  OpponentSearchState,
  PingState,
  DiceRollState,
} from '../../types/multiplayer';
import { CardInstance, Player } from '../../types';
import { generateLogId } from './multiplayerUtils';
import { applyRemoteAction } from './remoteActionHandler';
import {
  getSerializedGameState,
  setupGuestStateAutoSave,
  cleanupGuestStateAutoSave,
  registerGameWithServer,
  registerGuestWithServer,
  updateGameStatusOnServer,
  setupHostStateAutoSave,
  cleanupHostStateAutoSave,
} from './serverIntegration';


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
  reconnectAsHost: () => Promise<void>;
  reconnectAsGuest: () => Promise<void>;
  clearSession: () => void;
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

  // Dice roll for turn order
  startDiceRoll: () => void;
  sendDiceRollResult: () => void;
  sendTurnChoice: (startsFirst: boolean) => void;
  setDiceRollState: (state: DiceRollState | null) => void;

  // Harbinger dice roll
  startHarbingerDiceRoll: (player: Player) => void;
  sendHarbingerDiceResult: (rolls: number[], positions: string[]) => void;
  clearHarbingerDiceState: () => void;

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
      diceRollState: null,
      harbingerDiceState: null,
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

          // Update game status to playing when both players connected
          const gameCode = get().gameCode;
          if (gameCode) {
            updateGameStatusOnServer(gameCode, 'playing');
          }

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
          const nickname = get().nickname;
          if (peerId) {
            registerGameWithServer(code, peerId, nickname);
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

          // Update game status to playing when both players connected
          const gameCode = get().gameCode;
          if (gameCode) {
            updateGameStatusOnServer(gameCode, 'playing');
          }

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
          const nickname = get().nickname;
          if (peerId && nickname) {
            registerGuestWithServer(code, peerId, nickname);
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

      reconnectAsHost: async () => {
        const { gameCode } = get();
        if (!gameCode) {
          throw new Error('No game session to reconnect to');
        }

        set({ connectionStatus: 'initializing', connectionError: null });

        peerService.setOnPeerReady((peerId) => {
          set({ myPeerId: peerId, connectionStatus: 'waiting' });
        });

        peerService.setOnConnected(() => {
          const state = get();
          const gameState = useGameStore.getState();

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

          peerService.send({
            type: 'hello',
            nickname: state.nickname,
            peerId: state.myPeerId!,
          });

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
          // Re-create peer with the SAME game code
          await peerService.createGameWithCode(gameCode);
          set({ isHost: true, localPlayer: 'player' });

          const peerId = get().myPeerId;
          const nickname = get().nickname;
          if (peerId) {
            registerGameWithServer(gameCode, peerId, nickname);
          }

          setupHostStateAutoSave(gameCode);

          get().addLogEntry({
            type: 'system',
            player: null,
            nickname: null,
            message: `Reconnected to game. Code: ${gameCode}`,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to reconnect';
          set({ connectionStatus: 'error', connectionError: message });
          throw error;
        }
      },

      reconnectAsGuest: async () => {
        const { gameCode } = get();
        if (!gameCode) {
          throw new Error('No game session to reconnect to');
        }

        // Use existing joinGame logic
        await get().joinGame(gameCode);
      },

      clearSession: () => {
        const { gameCode } = get();
        peerService.cleanup();
        cleanupGuestStateAutoSave();
        cleanupHostStateAutoSave();
        // Mark game as finished on server when leaving
        if (gameCode) {
          updateGameStatusOnServer(gameCode, 'finished');
        }
        set({
          connectionStatus: 'disconnected',
          opponentPeerId: null,
          opponentNickname: null,
          gameCode: null,
          myPeerId: null,
          isHost: false,
          isPublicGame: false,
          localPlayer: 'player',
          opponentDrag: null,
        });
      },

      disconnect: () => {
        peerService.cleanup();
        cleanupGuestStateAutoSave();
        cleanupHostStateAutoSave();
        // Keep gameCode, isHost, localPlayer for reconnection
        set({
          connectionStatus: 'disconnected',
          opponentPeerId: null,
          opponentNickname: null,
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

      // Dice roll for turn order
      startDiceRoll: () => {
        set({
          diceRollState: {
            phase: 'waiting',
            myRoll: null,
            opponentRoll: null,
            winner: null,
          },
        });
        peerService.send({ type: 'dice_roll_start' });
      },

      sendDiceRollResult: () => {
        const result = Math.floor(Math.random() * 20) + 1;
        const state = get();

        set({
          diceRollState: {
            ...state.diceRollState!,
            phase: 'rolling',
            myRoll: result,
          },
        });

        peerService.send({ type: 'dice_roll_result', result });

        // Check if both rolls are in to determine winner
        const currentState = get().diceRollState;
        if (currentState && currentState.opponentRoll !== null) {
          const myRoll = result;
          const opponentRoll = currentState.opponentRoll;
          let winner: 'me' | 'opponent' | 'tie';
          if (myRoll > opponentRoll) {
            winner = 'me';
          } else if (opponentRoll > myRoll) {
            winner = 'opponent';
          } else {
            winner = 'tie';
          }
          set({
            diceRollState: {
              phase: winner === 'tie' ? 'waiting' : 'choosing',
              myRoll,
              opponentRoll,
              winner,
            },
          });
        }
      },

      sendTurnChoice: (startsFirst: boolean) => {
        const state = get();
        peerService.send({ type: 'turn_choice', startsFirst });

        // Set the turn based on choice
        // If winner chooses to start first: winner goes first
        // If winner chooses to go second: opponent goes first
        const gameStore = useGameStore.getState();
        const iAmHost = state.isHost;

        // Determine who starts based on the choice
        // If I'm the winner and I chose startsFirst=true, I go first
        // My data slot is 'player' if host, 'opponent' if guest
        let hostGoesFirst: boolean;
        if (iAmHost) {
          hostGoesFirst = startsFirst;
        } else {
          hostGoesFirst = !startsFirst;
        }

        gameStore.setCurrentTurn(hostGoesFirst ? 'player' : 'opponent');

        set({ diceRollState: { ...state.diceRollState!, phase: 'complete' } });

        // Clear after a brief delay
        setTimeout(() => {
          set({ diceRollState: null });
        }, 1500);

        state.addLogEntry({
          type: 'system',
          player: null,
          nickname: null,
          message: startsFirst
            ? `${state.nickname} chose to go first`
            : `${state.nickname} chose to go second`,
        });
      },

      setDiceRollState: (diceRollState) => {
        set({ diceRollState });
      },

      // Harbinger dice roll actions
      startHarbingerDiceRoll: (player: Player) => {
        const state = get();
        const isLocalInitiator = player === state.localPlayer;

        set({
          harbingerDiceState: {
            phase: 'rolling',
            initiator: player,
            rolls: [],
            positions: [],
            isLocalInitiator,
          },
        });

        // Broadcast to opponent
        peerService.send({ type: 'harbinger_dice_start', player });

        state.addLogEntry({
          type: 'system',
          player: null,
          nickname: null,
          message: `${isLocalInitiator ? state.nickname : state.opponentNickname} is rolling for Harbinger markers...`,
        });
      },

      sendHarbingerDiceResult: (rolls: number[], positions: string[]) => {
        const state = get();
        const gameStore = useGameStore.getState();

        // Update local state
        set({
          harbingerDiceState: {
            ...state.harbingerDiceState!,
            phase: 'complete',
            rolls,
            positions,
          },
        });

        // Set markers in game state
        gameStore.setHarbingerMarkers(positions);

        // Broadcast to opponent
        peerService.send({ type: 'harbinger_dice_result', rolls, positions });

        state.addLogEntry({
          type: 'system',
          player: null,
          nickname: null,
          message: `Harbinger markers placed at positions ${rolls.join(', ')}`,
        });
      },

      clearHarbingerDiceState: () => {
        set({ harbingerDiceState: null });
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
          case 'hello': {
            set({ opponentNickname: message.nickname });
            state.addLogEntry({
              type: 'system',
              player: null,
              nickname: null,
              message: `${message.nickname} connected`,
            });

            // If we're the host, check if this is a new game or reconnection
            if (state.isHost) {
              const gameState = useGameStore.getState();
              const hasGameState =
                gameState.turnNumber > 1 ||
                gameState.playerSiteDeck.length > 0 ||
                gameState.opponentSiteDeck.length > 0 ||
                gameState.playerHand.length > 0 ||
                gameState.opponentHand.length > 0;

              if (hasGameState) {
                // This is a reconnection, don't do dice roll
                // full_sync will be sent by the onConnected handler
              } else {
                // New game - start dice roll for turn order
                get().startDiceRoll();
              }
            }
            break;
          }

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
            // 3. Server (most reliable for reconnects)
            // 4. Fall back to host's data (hidden placeholders)
            const currentState = useGameStore.getState();
            const hasMemoryData =
              currentState.opponentHand.length > 0 ||
              currentState.opponentSiteDeck.length > 0 ||
              currentState.opponentSpellDeck.length > 0;

            // Helper to apply merged state
            const applyMergedState = (guestData: {
              opponentHand?: CardInstance[];
              opponentSiteDeck?: CardInstance[];
              opponentSpellDeck?: CardInstance[];
              opponentGraveyard?: CardInstance[];
            } | null, source: string) => {
              const mergedState: SerializedGameState = {
                // Shared board state from host
                board: message.state.board,
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
                // Guest's own data from best available source
                opponentHand: guestData?.opponentHand ?? message.state.opponentHand,
                opponentSiteDeck: guestData?.opponentSiteDeck ?? message.state.opponentSiteDeck,
                opponentSpellDeck: guestData?.opponentSpellDeck ?? message.state.opponentSpellDeck,
                opponentGraveyard: guestData?.opponentGraveyard ?? message.state.opponentGraveyard,
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
                message: source === 'memory' ? 'Game state synchronized' : `Game state restored from ${source}`,
              });
            };

            if (hasMemoryData) {
              // Use memory data
              applyMergedState({
                opponentHand: currentState.opponentHand,
                opponentSiteDeck: currentState.opponentSiteDeck,
                opponentSpellDeck: currentState.opponentSpellDeck,
                opponentGraveyard: currentState.opponentGraveyard,
              }, 'memory');
            } else {
              // Try localStorage first
              const localState = state.gameCode ? loadGuestState(state.gameCode) : null;
              if (localState) {
                applyMergedState(localState, 'local storage');
              } else if (state.gameCode) {
                // Try server as last resort before falling back to hidden cards
                fetch(`/api/games/${encodeURIComponent(state.gameCode)}/guest-state`)
                  .then(res => res.ok ? res.json() : null)
                  .then(data => {
                    if (data?.state) {
                      applyMergedState(data.state, 'server');
                    } else {
                      applyMergedState(null, 'host');
                    }
                  })
                  .catch(() => {
                    applyMergedState(null, 'host');
                  });
              } else {
                applyMergedState(null, 'host');
              }
            }
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

          case 'reveal_hand': {
            const cardNames = message.cards.map((c: { cardData: { name: string } }) => c.cardData.name);
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
              message: cardNames.length > 0
                ? `revealed their hand: ${cardNames.join(', ')}`
                : 'revealed their hand (empty)',
            });
            break;
          }

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

          case 'dice_roll_start': {
            // Opponent (host) initiated dice roll
            set({
              diceRollState: {
                phase: 'waiting',
                myRoll: null,
                opponentRoll: null,
                winner: null,
              },
            });
            break;
          }

          case 'dice_roll_result': {
            const currentState = get().diceRollState;
            if (!currentState) break;

            const opponentRoll = message.result;
            const myRoll = currentState.myRoll;

            // Update opponent's roll
            if (myRoll === null) {
              // We haven't rolled yet
              set({
                diceRollState: {
                  ...currentState,
                  opponentRoll,
                },
              });
            } else {
              // Both rolls are in, determine winner
              let winner: 'me' | 'opponent' | 'tie';
              if (myRoll > opponentRoll) {
                winner = 'me';
              } else if (opponentRoll > myRoll) {
                winner = 'opponent';
              } else {
                winner = 'tie';
              }
              set({
                diceRollState: {
                  ...currentState,
                  opponentRoll,
                  winner,
                  phase: winner === 'tie' ? 'waiting' : 'choosing',
                },
              });
            }
            break;
          }

          case 'turn_choice': {
            // Opponent (winner) made their choice
            const gameStore = useGameStore.getState();
            const iAmHost = state.isHost;
            const opponentStartsFirst = message.startsFirst;

            // Opponent chose, so set the turn accordingly
            let hostGoesFirst: boolean;
            if (iAmHost) {
              // I'm host, opponent is guest. If they start first, host doesn't go first.
              hostGoesFirst = !opponentStartsFirst;
            } else {
              // I'm guest, opponent is host. If they start first, host goes first.
              hostGoesFirst = opponentStartsFirst;
            }

            gameStore.setCurrentTurn(hostGoesFirst ? 'player' : 'opponent');

            const currentDiceState = get().diceRollState;
            if (currentDiceState) {
              set({ diceRollState: { ...currentDiceState, phase: 'complete' } });
            }

            // Clear after a brief delay
            setTimeout(() => {
              set({ diceRollState: null });
            }, 1500);

            state.addLogEntry({
              type: 'system',
              player: null,
              nickname: null,
              message: opponentStartsFirst
                ? `${state.opponentNickname} chose to go first`
                : `${state.opponentNickname} chose to go second`,
            });
            break;
          }

          case 'harbinger_dice_start': {
            // Opponent initiated Harbinger dice roll
            const isLocalInitiator = message.player === state.localPlayer;
            set({
              harbingerDiceState: {
                phase: 'rolling',
                initiator: message.player,
                rolls: [],
                positions: [],
                isLocalInitiator,
              },
            });

            state.addLogEntry({
              type: 'system',
              player: null,
              nickname: null,
              message: `${isLocalInitiator ? state.nickname : state.opponentNickname} is rolling for Harbinger markers...`,
            });
            break;
          }

          case 'harbinger_dice_result': {
            // Opponent finished rolling, apply the same markers locally
            const gameStore = useGameStore.getState();
            gameStore.setHarbingerMarkers(message.positions);

            set({
              harbingerDiceState: {
                ...get().harbingerDiceState!,
                phase: 'complete',
                rolls: message.rolls,
                positions: message.positions,
              },
            });

            state.addLogEntry({
              type: 'system',
              player: null,
              nickname: null,
              message: `Harbinger markers placed at positions ${message.rolls.join(', ')}`,
            });
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
        // Persist session for reconnection
        gameCode: state.gameCode,
        isHost: state.isHost,
        localPlayer: state.localPlayer,
      }),
    }
  )
);

