import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'games.db');
const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    game_code TEXT PRIMARY KEY,
    host_peer_id TEXT,
    guest_peer_id TEXT,
    state TEXT,
    updated_at INTEGER NOT NULL
  )
`);

// Migration: Add columns for public matchmaking
const tableInfo = db.prepare("PRAGMA table_info(games)").all() as Array<{ name: string }>;
const columnNames = tableInfo.map((col) => col.name);

if (!columnNames.includes('is_public')) {
  db.exec('ALTER TABLE games ADD COLUMN is_public INTEGER DEFAULT 0');
}
if (!columnNames.includes('host_nickname')) {
  db.exec('ALTER TABLE games ADD COLUMN host_nickname TEXT');
}
if (!columnNames.includes('created_at')) {
  db.exec('ALTER TABLE games ADD COLUMN created_at INTEGER');
}

// Types
interface GameRow {
  game_code: string;
  host_peer_id: string | null;
  guest_peer_id: string | null;
  state: string | null;
  updated_at: number;
  is_public: number;
  host_nickname: string | null;
  created_at: number | null;
}

export interface PublicGameRow {
  game_code: string;
  host_nickname: string;
  created_at: number;
}

// Peer registry
export function registerGame(gameCode: string, hostPeerId: string): void {
  db.prepare(`
    INSERT OR REPLACE INTO games (game_code, host_peer_id, guest_peer_id, state, updated_at)
    VALUES (?, ?, NULL, NULL, ?)
  `).run(gameCode, hostPeerId, Date.now());
}

export function registerGuest(gameCode: string, guestPeerId: string): void {
  db.prepare('UPDATE games SET guest_peer_id = ?, updated_at = ? WHERE game_code = ?')
    .run(guestPeerId, Date.now(), gameCode);
}

export function updatePeerId(gameCode: string, role: 'host' | 'guest', peerId: string): void {
  const column = role === 'host' ? 'host_peer_id' : 'guest_peer_id';
  db.prepare(`UPDATE games SET ${column} = ?, updated_at = ? WHERE game_code = ?`)
    .run(peerId, Date.now(), gameCode);
}

export function getGame(gameCode: string): GameRow | undefined {
  return db.prepare('SELECT * FROM games WHERE game_code = ?').get(gameCode) as GameRow | undefined;
}

// State management
export function saveGameState(gameCode: string, state: object): void {
  db.prepare('UPDATE games SET state = ?, updated_at = ? WHERE game_code = ?')
    .run(JSON.stringify(state), Date.now(), gameCode);
}

export function getGameState(gameCode: string): object | null {
  const row = db.prepare('SELECT state FROM games WHERE game_code = ?').get(gameCode) as { state: string | null } | undefined;
  return row?.state ? JSON.parse(row.state) : null;
}

export function deleteGame(gameCode: string): void {
  db.prepare('DELETE FROM games WHERE game_code = ?').run(gameCode);
}

// Cleanup old games (>24 hours)
export function cleanupOldGames(): number {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const result = db.prepare('DELETE FROM games WHERE updated_at < ?').run(cutoff);
  return result.changes;
}

// Public matchmaking
export function registerPublicGame(gameCode: string, hostPeerId: string, hostNickname: string): void {
  const now = Date.now();
  db.prepare(`
    INSERT OR REPLACE INTO games (game_code, host_peer_id, guest_peer_id, state, updated_at, is_public, host_nickname, created_at)
    VALUES (?, ?, NULL, NULL, ?, 1, ?, ?)
  `).run(gameCode, hostPeerId, now, hostNickname, now);
}

export function getPublicGames(): PublicGameRow[] {
  return db.prepare(`
    SELECT game_code, host_nickname, created_at
    FROM games
    WHERE is_public = 1 AND guest_peer_id IS NULL
    ORDER BY created_at ASC
  `).all() as PublicGameRow[];
}

export function removePublicGame(gameCode: string): void {
  db.prepare('DELETE FROM games WHERE game_code = ? AND is_public = 1 AND guest_peer_id IS NULL').run(gameCode);
}

// Cleanup stale public games (waiting >10 minutes without guest)
export function cleanupStalePublicGames(): number {
  const cutoff = Date.now() - 10 * 60 * 1000;
  const result = db.prepare(
    'DELETE FROM games WHERE is_public = 1 AND guest_peer_id IS NULL AND updated_at < ?'
  ).run(cutoff);
  return result.changes;
}
