import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DiceRollState } from '../../types/multiplayer';

interface DiceRollModalProps {
  isOpen: boolean;
  diceRollState: DiceRollState | null;
  myNickname: string;
  opponentNickname: string;
  onRoll: () => void;
  onChoose: (startsFirst: boolean) => void;
}

export function DiceRollModal({
  isOpen,
  diceRollState,
  myNickname,
  opponentNickname,
  onRoll,
  onChoose,
}: DiceRollModalProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [displayNumber, setDisplayNumber] = useState<number | null>(null);

  // Reset rolling animation when roll completes
  useEffect(() => {
    if (diceRollState?.myRoll !== null && diceRollState?.myRoll !== undefined && isRolling) {
      const finalRoll = diceRollState.myRoll;
      // Show a quick animation of random numbers
      let count = 0;
      const interval = setInterval(() => {
        setDisplayNumber(Math.floor(Math.random() * 20) + 1);
        count++;
        if (count >= 10) {
          clearInterval(interval);
          setDisplayNumber(finalRoll);
          setIsRolling(false);
        }
      }, 50);
      return () => clearInterval(interval);
    }
  }, [diceRollState?.myRoll, isRolling]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsRolling(false);
      setDisplayNumber(null);
    }
  }, [isOpen]);

  if (!isOpen || !diceRollState) return null;

  const { phase, myRoll, opponentRoll, winner } = diceRollState;

  const handleRoll = () => {
    setIsRolling(true);
    onRoll();
  };

  const canRoll = myRoll === null && phase !== 'complete';
  const waitingForOpponent = myRoll !== null && opponentRoll === null;
  const bothRolled = myRoll !== null && opponentRoll !== null;
  const iWon = winner === 'me';
  const isTie = winner === 'tie';

  return createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div
        className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white text-center mb-6">
          Roll for First Turn
        </h2>

        <div className="flex justify-between gap-4 mb-8">
          {/* My roll */}
          <div className="flex-1 text-center">
            <div className="text-sm text-gray-400 mb-2 truncate" title={myNickname}>
              {myNickname} (You)
            </div>
            <div
              className={`
                w-20 h-20 mx-auto rounded-lg flex items-center justify-center text-3xl font-bold
                ${myRoll !== null ? (iWon && bothRolled ? 'bg-green-600' : 'bg-gray-600') : 'bg-gray-700'}
                ${isTie && bothRolled ? 'bg-yellow-600' : ''}
                transition-colors duration-300
              `}
            >
              {isRolling ? (
                <span className="animate-pulse">{displayNumber ?? '?'}</span>
              ) : myRoll !== null ? (
                myRoll
              ) : (
                <span className="text-gray-500">-</span>
              )}
            </div>
            {iWon && bothRolled && !isTie && (
              <div className="text-green-400 text-sm mt-2 font-semibold">Winner</div>
            )}
          </div>

          {/* VS */}
          <div className="flex items-center justify-center">
            <span className="text-gray-500 text-xl font-bold">VS</span>
          </div>

          {/* Opponent roll */}
          <div className="flex-1 text-center">
            <div className="text-sm text-gray-400 mb-2 truncate" title={opponentNickname}>
              {opponentNickname}
            </div>
            <div
              className={`
                w-20 h-20 mx-auto rounded-lg flex items-center justify-center text-3xl font-bold
                ${opponentRoll !== null ? (winner === 'opponent' && bothRolled ? 'bg-green-600' : 'bg-gray-600') : 'bg-gray-700'}
                ${isTie && bothRolled ? 'bg-yellow-600' : ''}
                transition-colors duration-300
              `}
            >
              {opponentRoll !== null ? (
                opponentRoll
              ) : (
                <span className="text-gray-500">-</span>
              )}
            </div>
            {winner === 'opponent' && bothRolled && !isTie && (
              <div className="text-green-400 text-sm mt-2 font-semibold">Winner</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="text-center">
          {canRoll && !isRolling && (
            <button
              onClick={handleRoll}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-lg transition-colors"
            >
              Roll d20
            </button>
          )}

          {isRolling && (
            <div className="text-gray-400">Rolling...</div>
          )}

          {waitingForOpponent && !isRolling && (
            <div className="text-gray-400">
              Waiting for {opponentNickname} to roll...
            </div>
          )}

          {isTie && bothRolled && (
            <div className="space-y-3">
              <div className="text-yellow-400 font-semibold">Tie! Roll again</div>
              <button
                onClick={handleRoll}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-lg transition-colors"
              >
                Roll Again
              </button>
            </div>
          )}

          {iWon && bothRolled && !isTie && phase === 'choosing' && (
            <div className="space-y-3">
              <div className="text-green-400 font-semibold mb-4">You won! Choose your position:</div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => onChoose(true)}
                  className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors"
                >
                  Go First
                </button>
                <button
                  onClick={() => onChoose(false)}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-semibold transition-colors"
                >
                  Go Second
                </button>
              </div>
            </div>
          )}

          {winner === 'opponent' && bothRolled && !isTie && phase === 'choosing' && (
            <div className="text-gray-400">
              Waiting for {opponentNickname} to choose...
            </div>
          )}

          {phase === 'complete' && (
            <div className="text-green-400 font-semibold">
              Game starting...
            </div>
          )}
        </div>

        <p className="text-gray-500 text-xs text-center mt-6">
          Higher roll wins and chooses to go first or second
        </p>
      </div>
    </div>,
    document.body
  );
}
