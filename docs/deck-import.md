# Deck Import Feature

Import decks from Curiosa.io into the game.

## Architecture

```
React Frontend (3000) --> Vite Proxy --> Express Server (3001) --> Curiosa.io API
```

The Curiosa API requires an `Origin: https://curiosa.io` header, so requests must be proxied through our Express server.

## Files

### Backend
- `server/index.ts` - Express server entry point (port 3001)
- `server/routes/curiosa.ts` - `GET /api/curiosa/deck/:deckId` proxy endpoint

### Frontend
- `src/types/curiosa.ts` - Curiosa API response types
- `src/utils/cardTransform.ts` - Transforms Curiosa cards to CardInstance
- `src/services/curiosaApi.ts` - API client (`fetchDeck()`)
- `src/components/Modal/Modal.tsx` - Reusable modal component
- `src/components/DeckImport/DeckImportModal.tsx` - Import dialog
- `src/components/DeckImport/DeckImportButton.tsx` - Trigger button

### Modified
- `src/hooks/useGameState.ts` - Added `importDeck()` and `clearDecks()` actions
- `src/App.tsx` - DeckImportButton in player/opponent deck zones

## API

### Curiosa Proxy Endpoint
```
GET /api/curiosa/deck/:deckId
```

Calls Curiosa's tRPC batch endpoint:
```
https://curiosa.io/api/trpc/deck.getDecklistById,deck.getAvatarById,...
```

Returns:
```typescript
{
  decklist: CuriosaEntry[];  // Cards with quantity, card metadata, variant
  avatar: CuriosaEntry | null;
  sideboard: CuriosaEntry[];
  maybeboard: CuriosaEntry[];
}
```

## Data Transformation

Curiosa response is transformed to match our CardInstance format:

| Curiosa Field | CardInstance Field |
|--------------|-------------------|
| `card.type` | `cardData.guardian.type` |
| `card.category` | Determines deck: "Site" or "Spell" |
| `variant.slug` | `variant.slug` (maps to `/assets/cards/{slug}.png`) |
| `card.airThreshold` | `cardData.guardian.thresholds.air` |
| `quantity` | Creates N CardInstance objects |

## Deck Placement

- `card.category === 'Site'` goes to site deck
- `card.category === 'Spell'` goes to spell deck
- Avatar placed at position `'3-2'` (player) or `'0-2'` (opponent)
- Decks are shuffled after import

## Usage

1. Click "Import" button next to deck zones
2. Enter Curiosa deck ID (e.g., `cmil6rvuf0075la0467q03s4e`) or full URL
3. Click "Import Deck"

URL extraction: `extractDeckId()` in `cardTransform.ts` parses `curiosa.io/decks/{id}` URLs.

## Running

```bash
npm run dev  # Starts both Vite (3000) and Express (3001)
```

Individual servers:
```bash
npm run dev:client  # Vite only
npm run dev:server  # Express only
```
