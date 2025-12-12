# Sorcery TCG - Tabletop Client

Browser-based 1v1 tabletop game client for Sorcery: Contested Realm TCG. Supports P2P multiplayer via PeerJS with reconnection support.

## Getting Started

```bash
npm install
npm run dev       # Vite (3000) + Express API (3001)
```

Requires card images in `public/assets/cards/{slug}.png`. Images are not included in the repo.

## Features

- **P2P Multiplayer** - Real-time gameplay via PeerJS with automatic reconnection
- **Public Matchmaking** - Create public games or play with friends via shareable codes
- **4x5 Board Grid** - Drag and drop sites and units onto the board
- **Vertex Placement** - Place units at intersections between 4 sites
- **Deck Import** - Import decks from Curiosa.io by deck ID or URL
- **Card Counters** - Right-click cards to add/remove counters
- **Token Cards** - Spawn minion tokens, site tokens, and attachable status tokens
- **Cards Under Sites** - Store cards underneath sites
- **Tap/Untap** - Rotate cards 90 degrees to indicate tapped state
- **Life & Mana Tracking** - Adjust counters with +/- buttons
- **Turn Management** - Start turn untaps all cards and refills mana

## Hotkeys

| Key | Action |
|-----|--------|
| `D` | Duplicate hovered card (creates copy in casting zone) |
| `Del/Backspace` | Delete hovered card from board (not avatars) |
| `E` | Tap/untap hovered card (90 degree rotation) |
| `F` | Flip card face-down/face-up |
| `R` | Shuffle hovered deck |
| `T` | Raise hovered unit to top of stack |
| `U` | Toggle card under/over site |
| `W` | Ping at mouse location (visible to opponent) |
| `Shift` + drop | Put card on bottom of deck; attach equipment to top unit |
| `1-9` | Draw N cards from hovered deck |

## Commands

```bash
npm run dev           # Vite dev server + Express API server
npm run build         # TypeScript check + Vite production build
npm run build:all     # Build frontend + server for production
npm run start         # Run production server (serves built frontend)
npm run preview       # Preview Vite production build
npm run lint          # ESLint check
npm run test          # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Run tests with coverage report
npm run test:e2e      # Run Playwright E2E tests
```

## Docker Deployment

```bash
docker compose up --build
# Or directly:
docker build -t sorcery .
docker run -p 3000:3000 sorcery
```

**Environment Variables:**
- `PORT` - Server port (default: 3000)
- `CORS_ORIGIN` - Allowed CORS origin (default: http://localhost:3000)
- `NODE_ENV` - Set to "production" in Docker

**Volumes:**
```yaml
volumes:
  - ./public/assets/cards:/app/dist/assets/cards:ro  # Card images
  - ./data:/app/data                                  # SQLite persistence
```

## Architecture

**Tech Stack**: React 19, TypeScript, Vite, Zustand, dnd-kit, PeerJS, Express, SQLite, Tailwind CSS

**State Management**: Zustand store with multiplayer-aware actions that broadcast to opponent via P2P.

**Card Types**:
- **Sites** - Rendered horizontally (landscape), one per grid cell, provides mana + thresholds
- **Spells** (Minions, Magics, Auras, Artifacts) - Rendered vertically (portrait), stack on sites
- **Avatars** - Stored in site units, starting at positions 3,2 (player) and 0,2 (opponent)

## Project Structure

```
src/
  components/
    Board/           # BoardSite, BoardVertex, DraggableBoardCard
    Card/            # Card rendering with image/placeholder fallback
    Hand/            # Droppable hand with SortableCard
    DeckZone/        # Deck stacks with hover detection
    DiscardPile/     # Graveyard display
    DeckImport/      # Curiosa.io import modal
    GameControls/    # Life, mana, turn buttons
    GhostCard/       # Opponent drag visualization
    TokenSelector/   # Token spawning UI
  hooks/
    useGameState.ts  # Zustand store - state and raw actions
    useGameActions.ts # Multiplayer-aware actions (broadcasts to opponent)
    useMultiplayer.ts # P2P connection state and messaging
    useHotkeys.ts    # Keyboard shortcuts
  types/
    card.ts          # CardInstance, CardData, Thresholds
    game.ts          # BoardSite, GameState, position helpers
  utils/
    cardTransform.ts # Curiosa -> CardInstance conversion
server/
  index.ts           # Express entry with SQLite game storage
  routes/            # API routes (curiosa proxy, game state)
```

## Testing

Tests use Vitest with React Testing Library:

```bash
npm run test           # Watch mode
npm run test:coverage  # Coverage report
npm run test:e2e       # Playwright E2E tests
```

Test files are colocated with source code in `__tests__` directories.

## Deck Import

Import decks from Curiosa.io. Express server proxies requests to bypass CORS.

**Usage**: Click "Import" next to deck zones, enter deck ID or full curiosa.io URL.

Sites go to site deck, spells to spell deck, avatar placed on board. Decks are shuffled after import.
