import { useState } from 'react';
import { Modal } from '../Modal';
import { fetchDeck, CuriosaApiError } from '../../services/curiosaApi';
import { transformCuriosaDeck, extractDeckId } from '../../utils/cardTransform';
import { useGameActions } from '../../hooks/useGameActions';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';
import type { Player } from '../../types';

interface DeckImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
}

export function DeckImportModal({ isOpen, onClose, player }: DeckImportModalProps) {
  const [deckInput, setDeckInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { importDeck, clearDecks } = useGameActions();
  const { localPlayer, connectionStatus, startHarbingerDiceRoll } = useMultiplayerStore();
  const isMultiplayer = connectionStatus === 'connected';

  const handleImport = async () => {
    if (!deckInput.trim()) {
      setError('Please enter a deck ID or URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const deckId = extractDeckId(deckInput);
      const response = await fetchDeck(deckId);

      // In multiplayer, always import to your own deck (localPlayer)
      // In single player, use the player prop (which deck zone was clicked)
      const effectivePlayer = isMultiplayer ? localPlayer : player;

      const transformed = transformCuriosaDeck(response, effectivePlayer);

      // Clear existing decks first
      clearDecks(effectivePlayer);

      // Import the new deck
      importDeck(
        transformed.siteCards,
        transformed.spellCards,
        transformed.avatar,
        effectivePlayer,
        transformed.collectionCards
      );

      // Check if avatar is Harbinger - trigger special dice roll
      if (transformed.avatar?.cardData.name === 'Harbinger') {
        startHarbingerDiceRoll(effectivePlayer);
      }

      setSuccess(true);
      setDeckInput('');

      // Close modal after short delay
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err) {
      if (err instanceof CuriosaApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setDeckInput('');
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleImport();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Deck from Curiosa">
      <div className="space-y-4">
        <div>
          <label
            htmlFor="deck-input"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Deck ID or URL
          </label>
          <input
            id="deck-input"
            type="text"
            value={deckInput}
            onChange={(e) => setDeckInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., cmil6rvuf0075la0467q03s4e"
            disabled={isLoading}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-400">
            Enter the deck ID from curiosa.io/decks/[id] or paste the full URL
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 text-sm text-green-400 bg-green-900/20 border border-green-800 rounded-md">
            Deck imported successfully!
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isLoading || !deckInput.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {isLoading ? 'Importing...' : 'Import Deck'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
