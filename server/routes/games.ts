import { Router, Request, Response } from 'express';
import {
  registerGame,
  registerGuest,
  updatePeerId,
  getGame,
  saveGameState,
  getGameState,
  deleteGame,
  registerPublicGame,
  getPublicGames,
  removePublicGame,
} from '../db.js';

const router = Router();

// Public matchmaking: List available public games
// NOTE: This must come before /games/:gameCode routes to avoid "public" matching as gameCode
router.get('/games/public', (_req: Request, res: Response) => {
  const games = getPublicGames();
  const now = Date.now();

  res.json({
    games: games.map((game) => ({
      gameCode: game.game_code,
      hostNickname: game.host_nickname,
      waitTimeSeconds: Math.floor((now - game.created_at) / 1000),
    })),
  });
});

// Register new game (host calls on create)
router.post('/games/:gameCode/register', (req: Request, res: Response) => {
  const { gameCode } = req.params;
  const { peerId } = req.body;

  if (!peerId) {
    res.status(400).json({ error: 'peerId required' });
    return;
  }

  registerGame(gameCode, peerId);
  res.json({ success: true });
});

// Guest joins
router.post('/games/:gameCode/join', (req: Request, res: Response) => {
  const { gameCode } = req.params;
  const { peerId } = req.body;

  if (!peerId) {
    res.status(400).json({ error: 'peerId required' });
    return;
  }

  const game = getGame(gameCode);
  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  registerGuest(gameCode, peerId);
  res.json({ success: true, hostPeerId: game.host_peer_id });
});

// Reconnect (update peer ID)
router.post('/games/:gameCode/reconnect', (req: Request, res: Response) => {
  const { gameCode } = req.params;
  const { peerId, role } = req.body;

  if (!peerId || !role || (role !== 'host' && role !== 'guest')) {
    res.status(400).json({ error: 'peerId and role (host|guest) required' });
    return;
  }

  const game = getGame(gameCode);
  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  updatePeerId(gameCode, role, peerId);

  // Return the other player's peer ID for reconnection
  const otherPeerId = role === 'host' ? game.guest_peer_id : game.host_peer_id;
  res.json({ success: true, otherPeerId });
});

// Get game info (peer IDs for reconnection)
router.get('/games/:gameCode', (req: Request, res: Response) => {
  const { gameCode } = req.params;
  const game = getGame(gameCode);

  if (game) {
    res.json({
      gameCode: game.game_code,
      hostPeerId: game.host_peer_id,
      guestPeerId: game.guest_peer_id,
      hasState: !!game.state,
      updatedAt: game.updated_at,
    });
  } else {
    res.status(404).json({ error: 'Game not found' });
  }
});

// Save game state (host calls periodically)
router.post('/games/:gameCode/state', (req: Request, res: Response) => {
  const { gameCode } = req.params;
  const { state } = req.body;

  if (!state) {
    res.status(400).json({ error: 'state required' });
    return;
  }

  const game = getGame(gameCode);
  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  saveGameState(gameCode, state);
  res.json({ success: true });
});

// Get game state (for recovery)
router.get('/games/:gameCode/state', (req: Request, res: Response) => {
  const { gameCode } = req.params;
  const state = getGameState(gameCode);

  if (state) {
    res.json({ state });
  } else {
    res.status(404).json({ error: 'No saved state' });
  }
});

// Delete game
router.delete('/games/:gameCode', (req: Request, res: Response) => {
  const { gameCode } = req.params;
  deleteGame(gameCode);
  res.json({ success: true });
});

// Public matchmaking: Register a public game
router.post('/games/:gameCode/register-public', (req: Request, res: Response) => {
  const { gameCode } = req.params;
  const { peerId, nickname } = req.body;

  if (!peerId || !nickname) {
    res.status(400).json({ error: 'peerId and nickname required' });
    return;
  }

  registerPublicGame(gameCode, peerId, nickname);
  res.json({ success: true });
});

// Public matchmaking: Remove from public listing (cancel)
router.delete('/games/:gameCode/public', (req: Request, res: Response) => {
  const { gameCode } = req.params;
  removePublicGame(gameCode);
  res.json({ success: true });
});

export default router;
