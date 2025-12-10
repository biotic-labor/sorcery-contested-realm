# CLAUDE.md

Source of truth for Claude Code when working with this codebase.

## Project Overview

Browser-based 1v1 tabletop game client for Sorcery: Contested Realm TCG. Supports P2P multiplayer via PeerJS.

## Commands

```bash
npm run dev       # Vite (3000) + Express API (3001)
npm run build     # TypeScript check + Vite production build
npm run build:all # Build frontend + server for production
npm run start     # Run production server (serves built frontend)
npm run preview   # Preview Vite production build
```

## Docker Deployment

```bash
# Build and run locally
docker compose up --build

# Or build image directly
docker build -t sorcery .
docker run -p 3000:3000 sorcery
```

**Environment Variables:**
- `PORT` - Server port (default: 3000)
- `CORS_ORIGIN` - Allowed CORS origin (default: http://localhost:3000)
- `NODE_ENV` - Set to "production" in Docker

**Card Images:** Mount as volume if needed:
```yaml
volumes:
  - ./public/assets/cards:/app/dist/assets/cards:ro
```

**Persistent Data:** Game state is stored in SQLite at `/app/data/games.db`. Mount for persistence:
```yaml
volumes:
  - ./data:/app/data
```

## Server State Recovery

The server stores game state for reconnection support:
- Host registers game with server on creation
- Guest registers on join
- Host auto-saves state every 5 seconds (debounced)
- Games auto-delete after 24 hours
- Public games waiting >10 minutes auto-delete

**API Endpoints:**
- `POST /api/games/:code/register` - Register private game (host)
- `POST /api/games/:code/register-public` - Register public game with nickname
- `POST /api/games/:code/join` - Guest joins game
- `POST /api/games/:code/reconnect` - Update peer ID on reconnect
- `GET /api/games/:code` - Get game info (peer IDs)
- `GET /api/games/public` - List available public games
- `DELETE /api/games/:code/public` - Remove from public listing
- `POST /api/games/:code/state` - Save game state
- `GET /api/games/:code/state` - Get saved state
- `DELETE /api/games/:code` - Delete game

## Public Matchmaking

Players can create games in two modes:
- **Play with Friend**: Private game with shareable code
- **Find Match**: Public game visible in lobby list

Public games show host nickname and wait time. Games removed when:
- Host cancels
- Guest joins
- Waiting >10 minutes (stale cleanup)

## Hotkeys

| Key | Action |
|-----|--------|
| `E` | Tap/untap hovered card (90 degree rotation) |
| `F` | Flip card face-down/face-up |
| `R` | Shuffle hovered deck |
| `U` | Toggle card under/over site |
| `W` | Ping at mouse location (visible to opponent) |
| `Shift` + drop | Put card on bottom of deck |
| `1-9` | Draw N cards from hovered deck |

## Card Counters

Right-click any card on the board to access counter options:
- **Add Counter** - Adds a counter to the card
- **Remove Counter** - Removes a counter (only shown if card has counters)

Once a card has counters, a red badge appears in the top-right corner showing the count. Click the badge to adjust:
- Top half of badge: increment counter
- Bottom half of badge: decrement counter

Counter changes sync automatically in multiplayer.

## Architecture

### State Management
Zustand store in `src/hooks/useGameState.ts`:
- `board: BoardSite[][]` - 4x5 grid, each cell has `siteCard`, `units[]`, `underCards[]`
- `avatars: Record<string, CardInstance>` - Keyed by `"row-col"`
- `vertices: Record<string, CardInstance[]>` - Keyed by `"v-row-col"`, units at grid intersections
- Player/opponent: hands, decks (site + spell), graveyards
- Life, mana, thresholds, turn state
- `hoveredCard`, `selectedCard`, `hoveredDeck` for interactions

### useGameStore vs useGameActions (CRITICAL for Multiplayer)

**`useGameStore`** - Use for:
- Reading state: `board`, `avatars`, `vertices`, `playerHand`, `opponentHand`, `currentTurn`, etc.
- UI-only actions that don't affect game state: `hoverCard`, `selectCard`, `setHoveredDeck`

**`useGameActions`** - Use for ALL actions that modify shared game state:
- Card placement/movement: `placeCardOnSite`, `placeUnitOnSite`, `moveCard`, `placeAvatar`
- Card state changes: `rotateCard`, `toggleCardUnder`
- Deck operations: `drawCards`, `shuffleDeck`, `putCardOnTop`, `putCardOnBottom`
- Player stats: `adjustLife`, `adjustMana`, `adjustManaTotal`
- Turn management: `startTurn`, `endTurn`
- Graveyard: `addToGraveyard`, `removeFromGraveyard`

`useGameActions` wraps store actions to broadcast them over P2P in multiplayer mode. Using `useGameStore` directly for game-modifying actions will NOT sync to opponent.

### Multiplayer Perspective Mapping

Game state uses canonical player slots:
- `"player"` = host's data (hands, decks, life, etc.)
- `"opponent"` = guest's data

UI components use positional props:
- `player="player"` = bottom of screen (YOUR stuff)
- `player="opponent"` = top of screen (THEIR stuff)

**UI Reading State** - For guest, swap which state shows where:
```typescript
const isGuest = isMultiplayer && localPlayer === 'opponent';
const myHand = isGuest ? opponentHand : playerHand;
const theirHand = isGuest ? playerHand : opponentHand;
```

**UI Calling Actions** - Map UI player to data player:
```typescript
const dataPlayer = isGuest
  ? (uiPlayer === 'player' ? 'opponent' : 'player')
  : uiPlayer;
```

### Multiplayer Action Handlers (CRITICAL - NO SWAP)

In `useMultiplayer.ts` `applyRemoteAction()`, **DO NOT swap the player parameter** for data-slot actions. Data must go into the SAME slot on both clients:
- Host imports deck → `playerSiteDeck` on BOTH clients
- Guest imports deck → `opponentSiteDeck` on BOTH clients

The UI perspective mapping handles displaying the right data in the right position.

**Actions that must NOT swap player:**
- `drawCards`, `shuffleDeck`, `putCardOnTop`, `putCardOnBottom`
- `addToHand`, `removeFromHand`, `reorderHand`
- `addToGraveyard`, `removeFromGraveyard`
- `adjustLife`, `adjustMana`, `adjustManaTotal`
- `deckImported`, `startTurn`

**Board placement actions - DO NOT swap card owner:**
- `placeCardOnSite`, `placeUnitOnSite`, `placeUnitOnVertex` - card `owner` must remain canonical for rotation logic

**Actions that operate on shared board state (no player param or use cardId):**
- `rotateCard`, `toggleCardUnder` - find card by ID
- `moveCard`, `moveAvatar` - use board position
- `removeCardFromBoard`, `removeCardFromVertex` - use position/vertexKey

### Drag & Drop
Uses @dnd-kit/core. Cards track `source` ('hand' | 'board') and `sourcePosition` in drag data.

Drop targets:
- Board positions: `"row-col"` (e.g., `"2-3"`)
- Vertices: `"v-row-col"` (e.g., `"v-1-2"`)
- Decks: `"deck-player-site"` or `"deck-opponent-spell"`
- Discard: `"discard-player"` or `"discard-opponent"`
- Hands: `"hand-player"` or `"hand-opponent"`

**Player 2 Board Rotation & Drag Offset Fix:**
Player 2's board is rotated 180deg via CSS. This causes dnd-kit's DragOverlay to be offset from the cursor when dragging board cards. A custom modifier in `Game.tsx` (`rotatedBoardModifier`) compensates by shifting the overlay by the card's dimensions when Player 2 drags from the board.

**Card Ownership vs Visual Rotation:**
- `card.owner` indicates which player's data slot the card belongs to (canonical)
- `isOpponentCard` prop on `DraggableBoardCard` controls 180deg visual rotation (so cards face their owner)
- Drag permission uses actual ownership: `canDrag = card.owner === localPlayer`
- These are separate concerns: a card can be visually rotated but still draggable by its owner

**Unit Stacking Direction:**
In `BoardSite.tsx`, units stack based on ownership:
- Your cards: stack toward bottom-right
- Opponent cards: stack toward upper-left
The `rotationFix` variable accounts for Player 2's rotated board when calculating offsets.

### Card Types
- **Sites** - Rendered horizontally (landscape), one per grid cell, provides mana + thresholds
- **Spells** (Minions, Magics, Auras, Artifacts) - Rendered vertically (portrait), stack on sites
- **Avatars** - Always on board. Starting positions: player `3,2`, opponent `0,2`

### Key Types (`src/types/`)
```typescript
interface CardInstance {
  id: string;
  cardData: CardData;
  variant: CardVariant;
  rotation: number;  // 0 or 90 (tapped)
  owner: Player;
}

interface BoardSite {
  siteCard: CardInstance | null;
  units: CardInstance[];
  underCards: CardInstance[];  // Cards placed under the site
}
```

Position helpers: `positionKey(row, col)`, `parsePositionKey(key)`, `vertexKey(row, col)`, `parseVertexKey(key)`

## File Structure

```
src/
  components/
    Board/           # BoardSite, BoardVertex, DraggableBoardCard
    Card/            # Card rendering with image/placeholder fallback
    Hand/            # Droppable hand with SortableCard
    DeckZone/        # Deck stacks with hover detection
    DiscardPile/     # Graveyard display
    DeckImport/      # Curiosa.io import modal
    Modal/           # Reusable modal component
    GameControls/    # Life, mana, turn buttons
    PlayerStats/     # Stats panel
    CardPreview/     # Large card preview on hover
  hooks/
    useGameState.ts  # Zustand store - state and raw actions
    useGameActions.ts # Multiplayer-aware actions (broadcasts to opponent)
    useMultiplayer.ts # P2P connection state and messaging
    useHotkeys.ts    # Keyboard shortcuts
  types/
    card.ts          # CardInstance, CardData, Thresholds
    game.ts          # BoardSite, GameState, position helpers
    curiosa.ts       # Curiosa API response types
  services/
    curiosaApi.ts    # fetchDeck() API client
  utils/
    cardTransform.ts # Curiosa -> CardInstance conversion
    mockData.ts      # Test cards for development
server/
  index.ts           # Express entry (port 3001)
  routes/curiosa.ts  # GET /api/curiosa/deck/:deckId proxy
```

### Multiplayer Drag Visualization

**GhostCard** (`src/components/GhostCard/`):
Shows a semi-transparent card where the opponent is dragging. Receives position via P2P `drag_move` messages. Hidden when local player is dragging (`isLocalDragging` prop) to prevent visual conflicts.

**Card ID Generation** (`src/utils/cardTransform.ts`):
Card IDs are prefixed with owner: `${owner}-card-${counter}` (e.g., `player-card-1001`). This prevents ID collisions when both players import decks, ensuring each player can only drag their own cards.

### Known Issue: Hand Sync with Hidden Cards

**Problem:** Opponent's hand shows hidden placeholder cards with IDs like `hidden-player-site-0-timestamp`, but when cards are played, `removeFromHand` broadcasts the real card ID (e.g., `player-card-1001`). The opponent's client can't find that ID in their representation of the hand.

**Impact:** Opponent's hand count doesn't update when cards are played from hand.

**Potential Fix:** For remote `removeFromHand` actions, if the card ID isn't found, remove the first hidden card from the hand instead. Or: broadcast an index instead of card ID for hand operations.

## Deck Import

Imports decks from Curiosa.io. Express server proxies requests (CORS bypass).

```
Frontend -> Vite Proxy -> Express (3001) -> curiosa.io/api/trpc/...
```

**Usage**: Click "Import" next to deck zones, enter deck ID or full curiosa.io URL.

**Flow**:
1. `fetchDeck(deckId)` calls `/api/curiosa/deck/:deckId`
2. `transformCuriosaResponse()` converts to `CardInstance[]`
3. `importDeck()` places cards: sites -> site deck, spells -> spell deck, avatar -> board
4. Decks shuffled after import

## Card Images

Expects local assets at `/public/assets/cards/{slug}.png`. Falls back to colored placeholder on error. Card slugs come from Curiosa variant data.

