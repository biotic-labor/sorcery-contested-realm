import { useGameStore } from '../../hooks/useGameState';
import { useGameActions } from '../../hooks/useGameActions';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';

export function GameControls() {
  // Read-only state from store
  const { currentTurn, turnNumber } = useGameStore();

  // Broadcasted actions
  const { endTurn, startTurn } = useGameActions();

  // Perspective mapping for multiplayer
  const { localPlayer, connectionStatus } = useMultiplayerStore();
  const isMultiplayer = connectionStatus === 'connected';
  const isGuest = isMultiplayer && localPlayer === 'opponent';

  // Map currentTurn to UI display
  // In game state: "player" = host, "opponent" = guest
  // For UI: show "You" when it's the local player's turn
  const isMyTurn = isGuest
    ? currentTurn === 'opponent'
    : currentTurn === 'player';

  // When clicking Start Turn, we need to pass the data player
  const handleStartTurn = () => {
    // Start turn for whoever's turn it currently is (data perspective)
    startTurn(currentTurn);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-600">
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <span className="text-gray-400">Turn:</span>{' '}
          <span className="text-white font-bold">{turnNumber}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-400">Current Player:</span>{' '}
          <span className={`font-bold ${isMyTurn ? 'text-green-400' : 'text-red-400'}`}>
            {isMyTurn ? 'You' : 'Opponent'}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleStartTurn}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
        >
          Start Turn
        </button>
        <button
          onClick={endTurn}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
        >
          End Turn
        </button>
      </div>
    </div>
  );
}
