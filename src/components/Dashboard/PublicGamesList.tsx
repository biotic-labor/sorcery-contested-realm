import { useState, useEffect, useCallback } from 'react';
import { PublicGame } from '../../types/multiplayer';

interface PublicGamesListProps {
  onJoinGame: (gameCode: string) => void;
  disabled?: boolean;
}

export function PublicGamesList({ onJoinGame, disabled }: PublicGamesListProps) {
  const [games, setGames] = useState<PublicGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    try {
      const response = await fetch('/api/games/public');
      if (!response.ok) {
        throw new Error('Failed to fetch games');
      }
      const data = await response.json();
      setGames(data.games);
      setError(null);
    } catch (err) {
      setError('Failed to load games');
      console.error('Error fetching public games:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();

    // Poll every 5 seconds
    const interval = setInterval(fetchGames, 5000);

    return () => clearInterval(interval);
  }, [fetchGames]);

  const formatWaitTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>{error}</p>
        <button
          onClick={fetchGames}
          className="mt-2 text-sm text-blue-400 hover:text-blue-300"
        >
          Retry
        </button>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>No public games available</p>
        <p className="text-sm mt-1">Create one or wait for others to join</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {games.map((game) => (
        <div
          key={game.gameCode}
          className="flex items-center justify-between p-3 bg-gray-700/50 rounded-md"
        >
          <div>
            <span className="font-medium">{game.hostNickname}</span>
            <span className="text-gray-400 text-sm ml-2">
              waiting {formatWaitTime(game.waitTimeSeconds)}
            </span>
          </div>
          <button
            onClick={() => onJoinGame(game.gameCode)}
            disabled={disabled}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
          >
            Join
          </button>
        </div>
      ))}
    </div>
  );
}
