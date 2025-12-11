import { useState, useEffect, useCallback } from 'react';
import { ActiveGame } from '../../types/multiplayer';

export function ActiveGamesList() {
  const [games, setGames] = useState<ActiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    try {
      const response = await fetch('/api/games/active');
      if (!response.ok) {
        throw new Error('Failed to fetch games');
      }
      const data = await response.json();
      setGames(data.games);
      setError(null);
    } catch (err) {
      setError('Failed to load games');
      console.error('Error fetching active games:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();

    // Poll every 10 seconds (less frequent than public games list)
    const interval = setInterval(fetchGames, 10000);

    return () => clearInterval(interval);
  }, [fetchGames]);

  const formatPlayTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
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
        <p>No games in progress</p>
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
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{game.hostNickname || 'Unknown'}</span>
              <span className="text-gray-500">vs</span>
              <span className="font-medium">{game.guestNickname || 'Unknown'}</span>
            </div>
            <span className="text-gray-400 text-sm">
              playing for {formatPlayTime(game.playTimeSeconds)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
