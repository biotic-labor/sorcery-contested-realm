# CLAUDE.md

Source of truth for Claude Code when working with this codebase.

## Project Overview

Browser-based 1v1 tabletop game client for Sorcery: Contested Realm TCG. MVP phase with local hot-seat play. Future: P2P multiplayer via PeerJS.

## Commands

```bash
npm run dev       # Vite (3000) + Express API (3001)
npm run build     # TypeScript check + production build
npm run preview   # Preview production build
```

## Hotkeys

| Key | Action |
|-----|--------|
| `E` | Tap/untap hovered card (90 degree rotation) |
| `R` | Shuffle hovered deck |
| `U` | Toggle card under/over site |
| `1-9` | Draw N cards from hovered deck |

## Architecture

### State Management
Zustand store in `src/hooks/useGameState.ts`:
- `board: BoardSite[][]` - 4x5 grid, each cell has `siteCard`, `units[]`, `underCards[]`
- `avatars: Record<string, CardInstance>` - Keyed by `"row-col"`
- `vertices: Record<string, CardInstance[]>` - Keyed by `"v-row-col"`, units at grid intersections
- Player/opponent: hands, decks (site + spell), graveyards
- Life, mana, thresholds, turn state
- `hoveredCard`, `selectedCard`, `hoveredDeck` for interactions

### Drag & Drop
Uses @dnd-kit/core. Cards track `source` ('hand' | 'board') and `sourcePosition` in drag data.

Drop targets:
- Board positions: `"row-col"` (e.g., `"2-3"`)
- Vertices: `"v-row-col"` (e.g., `"v-1-2"`)
- Decks: `"deck-player-site"` or `"deck-opponent-spell"`
- Discard: `"discard-player"` or `"discard-opponent"`
- Hands: `"hand-player"` or `"hand-opponent"`

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
    useGameState.ts  # Zustand store - ALL game state and actions
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

## Store Actions (Key)

**Placement**: `placeCardOnSite`, `placeUnitOnSite`, `placeUnitOnVertex`, `placeAvatar`
**Movement**: `moveCard`, `moveAvatar`, `removeFromHand`, `removeCardFromBoard`, `removeCardFromVertex`
**Card State**: `rotateCard`, `toggleCardUnder`, `untapAllCards`
**Decks**: `drawCards`, `putCardOnTop`, `putCardOnBottom`, `shuffleDeck`
**Graveyard**: `addToGraveyard`, `removeFromGraveyard`
**Game**: `startTurn`, `endTurn`, `adjustLife`, `adjustMana`, `importDeck`, `clearDecks`
