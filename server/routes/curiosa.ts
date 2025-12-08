import { Router, Request, Response } from 'express';

const router = Router();

interface CuriosaDeckResponse {
  decklist: unknown[];
  avatar: unknown | null;
  sideboard: unknown[];
  maybeboard: unknown[];
}

router.get('/deck/:deckId', async (req: Request, res: Response) => {
  const { deckId } = req.params;

  if (!deckId) {
    res.status(400).json({ error: 'Deck ID is required' });
    return;
  }

  // Construct the tRPC batch URL for Curiosa
  const input = JSON.stringify({
    '0': { json: { id: deckId } },
    '1': { json: { id: deckId } },
    '2': { json: { id: deckId } },
    '3': { json: { id: deckId } },
  });

  const url = `https://curiosa.io/api/trpc/deck.getDecklistById,deck.getAvatarById,deck.getSideboardById,deck.getMaybeboardById?batch=1&input=${encodeURIComponent(input)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Origin: 'https://curiosa.io',
        Referer: `https://curiosa.io/decks/${deckId}`,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      res
        .status(response.status)
        .json({ error: `Curiosa API error: ${response.statusText}` });
      return;
    }

    const data = await response.json();

    // Parse the tRPC batch response
    // Response is an array of 4 results: [decklist, avatar, sideboard, maybeboard]
    const result: CuriosaDeckResponse = {
      decklist: [],
      avatar: null,
      sideboard: [],
      maybeboard: [],
    };

    if (Array.isArray(data)) {
      // Extract decklist (index 0)
      if (data[0]?.result?.data?.json) {
        result.decklist = data[0].result.data.json;
      }

      // Extract avatar (index 1)
      if (data[1]?.result?.data?.json) {
        result.avatar = data[1].result.data.json;
      }

      // Extract sideboard (index 2)
      if (data[2]?.result?.data?.json) {
        result.sideboard = data[2].result.data.json;
      }

      // Extract maybeboard (index 3)
      if (data[3]?.result?.data?.json) {
        result.maybeboard = data[3].result.data.json;
      }
    }

    // Check if we got any data
    if (result.decklist.length === 0 && !result.avatar) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching deck from Curiosa:', error);
    res.status(500).json({ error: 'Failed to fetch deck from Curiosa' });
  }
});

export default router;
