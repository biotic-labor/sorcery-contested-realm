import type { CuriosaDeckResponse } from '../types/curiosa';

export class CuriosaApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'CuriosaApiError';
  }
}

export async function fetchDeck(deckId: string): Promise<CuriosaDeckResponse> {
  if (!deckId || deckId.trim() === '') {
    throw new CuriosaApiError('Deck ID is required');
  }

  const response = await fetch(`/api/curiosa/deck/${encodeURIComponent(deckId.trim())}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new CuriosaApiError('Deck not found. Please check the deck ID.', 404);
    }
    throw new CuriosaApiError(
      `Failed to fetch deck: ${response.statusText}`,
      response.status
    );
  }

  const data = await response.json();

  // Validate response structure
  if (!data || typeof data !== 'object') {
    throw new CuriosaApiError('Invalid response from server');
  }

  // Check for API error in response
  if (data.error) {
    throw new CuriosaApiError(data.error);
  }

  return data as CuriosaDeckResponse;
}
