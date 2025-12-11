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
    <div className="flex items-center justify-center p-4 bg-gray-800 rounded-lg border border-gray-600">
      <div className="flex items-center gap-4">
        <button
          onClick={handleStartTurn}
          disabled={isMultiplayer && !isMyTurn}
          className={`px-4 py-2 text-white text-sm rounded transition-colors ${
            isMultiplayer && !isMyTurn
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          Start Turn
        </button>
        <div className="text-sm">
          <span className="text-gray-400">Turn:</span>{' '}
          <span className="text-white font-bold">{turnNumber}</span>
        </div>
        <div className="text-sm">
          <span className={`font-bold ${isMyTurn ? 'text-green-400' : 'text-red-400'}`}>
            {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
          </span>
        </div>
        <button
          onClick={endTurn}
          disabled={isMultiplayer && !isMyTurn}
          className={`px-4 py-2 text-white text-sm rounded transition-colors ${
            isMultiplayer && !isMyTurn
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          End Turn
        </button>
      </div>
    </div>
  );
}
