# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser-based 1v1 tabletop game client for Sorcery TCG. Currently in MVP phase with local hot-seat play. Future plans include P2P multiplayer via PeerJS.

## Commands

```bash
npm run dev      # Start Vite dev server (http://localhost:3000)
npm run build    # TypeScript check + Vite production build
npm run lint     # ESLint with zero warnings allowed
npm run preview  # Preview production build
```

## Architecture

**State Management**: Zustand store in `src/hooks/useGameState.ts` manages all game state including:
- 4x5 board grid (`BoardSite[][]`) where each site holds a site card and array of units
- Avatars stored separately by position key (`"row-col"`)
- Player/opponent hands, decks, graveyards
- Selected and hovered card tracking

**Drag & Drop**: Uses @dnd-kit/core. Cards track their source (`'hand'` or `'board'`) and `sourcePosition` in drag data to handle both hand-to-board and board-to-board movements.

**Card Types**:
- **Sites** - Rendered horizontally (landscape), fill the board grid over time
- **Spells** (Minions, Magics, Auras, Artifacts) - Rendered vertically (portrait), stack on sites
- **Avatars** - Always on board (never in hand), movable between sites. Starting positions: player at `3,2`, opponent at `0,2`

**Key Data Structures** (`src/types/`):
- `CardInstance` - Runtime card with unique ID, rotation state, owner
- `BoardSite` - Grid cell with optional site card + array of units
- Position helpers: `positionKey(row, col)` and `parsePositionKey(key)`

**Card Images**: Currently expects local assets at `/assets/cards/{slug}.png`. Falls back to colored placeholder div on error. Production will use S3/CDN.

**Card Data API**: Card metadata from `api.sorcerytcg.com/api/cards` (not yet integrated for live fetching).

## Hotkeys

- `R` - Rotate (tap/untap) hovered card 90 degrees
- `U` - Toggle card under/over site
- `1-9` - Draw N cards from hovered deck
