import { useGameStore } from '../../hooks/useGameState';

export function GameControls() {
  const { currentTurn, turnNumber, endTurn, startTurn } = useGameStore();

  return (
    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-600">
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <span className="text-gray-400">Turn:</span>{' '}
          <span className="text-white font-bold">{turnNumber}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-400">Current Player:</span>{' '}
          <span className={`font-bold ${currentTurn === 'player' ? 'text-green-400' : 'text-red-400'}`}>
            {currentTurn === 'player' ? 'You' : 'Opponent'}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => startTurn(currentTurn)}
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
