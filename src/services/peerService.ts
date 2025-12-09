import Peer, { DataConnection } from 'peerjs';
import { GameMessage, generateGameCode } from '../types/multiplayer';

type MessageHandler = (message: GameMessage) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: Error) => void;

interface PeerServiceEvents {
  onMessage: MessageHandler | null;
  onConnected: ConnectionHandler | null;
  onDisconnected: ConnectionHandler | null;
  onError: ErrorHandler | null;
  onPeerReady: ((peerId: string) => void) | null;
}

class PeerService {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private gameCode: string | null = null;
  private isHost: boolean = false;
  private events: PeerServiceEvents = {
    onMessage: null,
    onConnected: null,
    onDisconnected: null,
    onError: null,
    onPeerReady: null,
  };

  // Event setters
  setOnMessage(handler: MessageHandler | null) {
    this.events.onMessage = handler;
  }

  setOnConnected(handler: ConnectionHandler | null) {
    this.events.onConnected = handler;
  }

  setOnDisconnected(handler: ConnectionHandler | null) {
    this.events.onDisconnected = handler;
  }

  setOnError(handler: ErrorHandler | null) {
    this.events.onError = handler;
  }

  setOnPeerReady(handler: ((peerId: string) => void) | null) {
    this.events.onPeerReady = handler;
  }

  // Create a new game as host
  createGame(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.cleanup();
      this.isHost = true;
      this.gameCode = generateGameCode();

      try {
        this.peer = new Peer(this.gameCode);

        this.peer.on('open', (id) => {
          this.events.onPeerReady?.(id);
          resolve(this.gameCode!);
        });

        this.peer.on('connection', (conn) => {
          this.setupConnection(conn);
        });

        this.peer.on('error', (err) => {
          const error = new Error(err.message || 'Peer connection error');
          this.events.onError?.(error);
          reject(error);
        });

        this.peer.on('disconnected', () => {
          // Lost connection to signaling server, try to reconnect
          if (this.peer && !this.peer.destroyed) {
            this.peer.reconnect();
          }
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create peer');
        reject(error);
      }
    });
  }

  // Join an existing game as guest
  joinGame(code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cleanup();
      this.isHost = false;
      this.gameCode = code.toUpperCase();

      try {
        this.peer = new Peer();

        this.peer.on('open', (id) => {
          this.events.onPeerReady?.(id);

          // Connect to the host
          const conn = this.peer!.connect(this.gameCode!, {
            reliable: true,
          });

          conn.on('open', () => {
            this.setupConnection(conn);
            resolve();
          });

          conn.on('error', (err) => {
            const error = new Error(err.message || 'Connection error');
            this.events.onError?.(error);
            reject(error);
          });
        });

        this.peer.on('error', (err) => {
          let errorMessage = err.message || 'Peer connection error';

          // Handle specific error types
          if (err.type === 'peer-unavailable') {
            errorMessage = 'Game not found. Check the code and try again.';
          }

          const error = new Error(errorMessage);
          this.events.onError?.(error);
          reject(error);
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to join game');
        reject(error);
      }
    });
  }

  private setupConnection(conn: DataConnection) {
    this.connection = conn;

    conn.on('data', (data) => {
      const message = data as GameMessage;
      this.events.onMessage?.(message);
    });

    conn.on('close', () => {
      this.events.onDisconnected?.();
    });

    conn.on('error', (err) => {
      this.events.onError?.(new Error(err.message || 'Connection error'));
    });

    this.events.onConnected?.();
  }

  // Send a message to the connected peer
  send(message: GameMessage): boolean {
    if (!this.connection || !this.connection.open) {
      console.warn('Cannot send message: no open connection');
      return false;
    }

    try {
      this.connection.send(message);
      return true;
    } catch (err) {
      console.error('Failed to send message:', err);
      return false;
    }
  }

  // Get connection state
  isConnected(): boolean {
    return this.connection?.open ?? false;
  }

  getGameCode(): string | null {
    return this.gameCode;
  }

  getIsHost(): boolean {
    return this.isHost;
  }

  getPeerId(): string | null {
    return this.peer?.id ?? null;
  }

  getOpponentPeerId(): string | null {
    return this.connection?.peer ?? null;
  }

  // Cleanup
  cleanup() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.gameCode = null;
    this.isHost = false;
  }

  // Disconnect but keep peer alive (for reconnection)
  disconnect() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
  }
}

// Singleton instance
export const peerService = new PeerService();
