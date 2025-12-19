import { CardInstance, Thresholds } from './card';

export type Player = 'player' | 'opponent';
export type DeckType = 'site' | 'spell';

// Board position (row 0-3, col 0-4)
export interface BoardPosition {
  row: number;
  col: number;
}

// Vertex position (row 0-2, col 0-3) - intersections between 4 sites
export interface VertexPosition {
  row: number;
  col: number;
}

// A site on the board can have a site card and multiple spells/units on top
export interface BoardSite {
  siteCard: CardInstance | null;
  units: CardInstance[]; // Minions, Artifacts, Auras on this site
  underCards: CardInstance[]; // Cards placed underneath the site
}

// The game board is a 4x5 grid
export type BoardGrid = BoardSite[][];

export interface GameState {
  // Board: 4 rows x 5 columns
  board: BoardGrid;

  // Vertices: units at intersections, keyed by "v-row-col"
  vertices: Record<string, CardInstance[]>;

  // Player hands
  playerHand: CardInstance[];
  opponentHand: CardInstance[];

  // Decks
  playerSiteDeck: CardInstance[];
  playerSpellDeck: CardInstance[];
  opponentSiteDeck: CardInstance[];
  opponentSpellDeck: CardInstance[];

  // Graveyards
  playerGraveyard: CardInstance[];
  opponentGraveyard: CardInstance[];

  // Spell stacks (casting zone - cards being played before going to graveyard)
  playerSpellStack: CardInstance[];
  opponentSpellStack: CardInstance[];

  // Collections (sideboard cards)
  playerCollection: CardInstance[];
  opponentCollection: CardInstance[];

  // Magician avatar flags (no site deck - sites go in spellbook)
  playerIsMagician: boolean;
  opponentIsMagician: boolean;

  // Life totals
  playerLife: number;
  opponentLife: number;

  // Mana pools (available / total)
  playerMana: number;
  playerManaTotal: number;
  opponentMana: number;
  opponentManaTotal: number;

  // Thresholds (from sites)
  playerThresholds: Thresholds;
  opponentThresholds: Thresholds;

  // Turn state
  currentTurn: Player;
  turnNumber: number;
  turnStarted: boolean;

  // Hovered card for interactions
  hoveredCard: CardInstance | null;

  // Hovered deck for hotkey targeting
  hoveredDeck: { player: Player; deckType: DeckType } | null;

  // Currently shuffling deck (for animation)
  shufflingDeck: { player: Player; deckType: DeckType } | null;

  // Harbinger markers (position keys where Cthulhu markers are placed)
  harbingerMarkers: string[];
}

// Helper to create empty board
export function createEmptyBoard(): BoardGrid {
  return Array(4)
    .fill(null)
    .map(() =>
      Array(5)
        .fill(null)
        .map(() => ({
          siteCard: null,
          units: [],
          underCards: [],
        }))
    );
}

// Helper to create position key
export function positionKey(row: number, col: number): string {
  return `${row}-${col}`;
}

// Helper to parse position key
export function parsePositionKey(key: string): BoardPosition {
  const [row, col] = key.split('-').map(Number);
  return { row, col };
}

// Helper to create vertex key
export function vertexKey(row: number, col: number): string {
  return `v-${row}-${col}`;
}

// Helper to parse vertex key
export function parseVertexKey(key: string): VertexPosition {
  const parts = key.split('-');
  const row = Number(parts[1]);
  const col = Number(parts[2]);
  return { row, col };
}

// Harbinger dice helpers
// Dice values 1-20 map to board positions (row-major order)
export function diceValueToPosition(diceValue: number): BoardPosition {
  const row = Math.floor((diceValue - 1) / 5);
  const col = (diceValue - 1) % 5;
  return { row, col };
}

export function positionToDiceValue(position: BoardPosition): number {
  return position.row * 5 + position.col + 1;
}

// Roll N unique d20 values (re-rolls duplicates)
export function rollUniqueD20s(count: number): number[] {
  const results: Set<number> = new Set();
  while (results.size < count) {
    results.add(Math.floor(Math.random() * 20) + 1);
  }
  return Array.from(results);
}
