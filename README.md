# Sorcery TCG - Tabletop Client

Browser-based 1v1 tabletop game client for Sorcery: Contested Realm TCG. Currently in MVP phase with local hot-seat play.

## Getting Started

```bash
npm install
npm run dev      # Start dev server at http://localhost:3000
```

Requires card images in `public/assets/cards/{slug}.png`. Images are not included in the repo.

## Features

- **4x5 Board Grid** - Drag and drop sites and units onto the board
- **Deck Import** - Import decks from Curiosa.io by deck ID or URL
- **Card Zones** - Site deck, spell deck, graveyard for each player
- **Vertex Placement** - Place units at intersections between 4 sites
- **Cards Under Sites** - Store cards underneath sites (press `U` to toggle)
- **Tap/Untap** - Rotate cards 90 degrees to indicate tapped state
- **Life & Mana Tracking** - Adjust counters with +/- buttons
- **Turn Management** - Start turn untaps all cards and refills mana

## Hotkeys

| Key | Action |
|-----|--------|
| `R` | Tap/untap hovered card |
| `U` | Move card under/over site |
| `1-9` | Draw N cards from hovered deck |

## Architecture

**Tech Stack**: React, TypeScript, Vite, Zustand, dnd-kit

**State**: Single Zustand store (`src/hooks/useGameState.ts`) manages board, hands, decks, graveyards, life, mana, and thresholds.

**Card Types**:
- **Sites** - Rendered horizontally, one per grid cell
- **Spells** (Minions, Magics, Auras, Artifacts) - Rendered vertically, stack on sites
- **Avatars** - Always on board, starting at positions 3,2 (player) and 0,2 (opponent)

## Project Structure

```
src/
  components/
    Board/          # BoardSite, BoardVertex, DraggableBoardCard
    Card/           # Card rendering with image/placeholder
    Hand/           # Player hands with sorting
    DeckZone/       # Deck stacks with draw functionality
    DiscardPile/    # Graveyard display
    DeckImport/     # Curiosa.io import modal
  hooks/
    useGameState.ts # Zustand store
    useHotkeys.ts   # Keyboard shortcuts
  types/
    card.ts         # CardInstance, CardData types
    game.ts         # BoardSite, GameState, position helpers
  utils/
    cardTransform.ts # Curiosa API to CardInstance conversion
server/
  routes/curiosa.ts # Proxy for Curiosa API (CORS bypass)
```

## Commands

```bash
npm run dev       # Vite dev server + Express API server
npm run build     # TypeScript check + production build
npm run preview   # Preview production build
```

## Roadmap

- P2P multiplayer via PeerJS
- Card database integration from api.sorcerytcg.com
- Cloud-hosted card images (S3/CDN)
