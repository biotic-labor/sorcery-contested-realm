import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HarbingerDiceState } from '../../types/multiplayer';
import { diceValueToPosition, positionKey } from '../../types';
import { CthulhuMarker } from '../Board/CthulhuMarker';

interface HarbingerDiceModalProps {
  isOpen: boolean;
  harbingerDiceState: HarbingerDiceState | null;
  onComplete: (rolls: number[], positions: string[]) => void;
  onClose: () => void;
}

interface DiceSlot {
  value: number | null;
  isRolling: boolean;
  displayValue: number;
}

export function HarbingerDiceModal({
  isOpen,
  harbingerDiceState,
  onComplete,
  onClose,
}: HarbingerDiceModalProps) {
  const [diceSlots, setDiceSlots] = useState<DiceSlot[]>([
    { value: null, isRolling: false, displayValue: 1 },
    { value: null, isRolling: false, displayValue: 1 },
    { value: null, isRolling: false, displayValue: 1 },
  ]);
  const [currentRollIndex, setCurrentRollIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [finalRolls, setFinalRolls] = useState<number[]>([]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && harbingerDiceState?.phase === 'rolling') {
      setDiceSlots([
        { value: null, isRolling: false, displayValue: 1 },
        { value: null, isRolling: false, displayValue: 1 },
        { value: null, isRolling: false, displayValue: 1 },
      ]);
      setCurrentRollIndex(0);
      setIsComplete(false);
      setFinalRolls([]);
    }
  }, [isOpen, harbingerDiceState?.phase]);

  // Handle incoming results from opponent (non-initiator view)
  useEffect(() => {
    if (
      harbingerDiceState?.phase === 'complete' &&
      harbingerDiceState.rolls.length === 3 &&
      !harbingerDiceState.isLocalInitiator
    ) {
      // Show the received rolls
      setDiceSlots(
        harbingerDiceState.rolls.map((value) => ({
          value,
          isRolling: false,
          displayValue: value,
        }))
      );
      setFinalRolls(harbingerDiceState.rolls);
      setIsComplete(true);
    }
  }, [harbingerDiceState]);

  // Roll a single die with animation
  const rollDie = useCallback((index: number, existingValues: number[]) => {
    // Start rolling animation
    setDiceSlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], isRolling: true };
      return next;
    });

    // Animate random numbers
    let count = 0;
    const interval = setInterval(() => {
      setDiceSlots((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          displayValue: Math.floor(Math.random() * 20) + 1,
        };
        return next;
      });
      count++;

      if (count >= 15) {
        clearInterval(interval);

        // Generate unique value
        let finalValue: number;
        do {
          finalValue = Math.floor(Math.random() * 20) + 1;
        } while (existingValues.includes(finalValue));

        setDiceSlots((prev) => {
          const next = [...prev];
          next[index] = {
            value: finalValue,
            isRolling: false,
            displayValue: finalValue,
          };
          return next;
        });

        // Update final rolls and move to next
        setFinalRolls((prev) => {
          const newRolls = [...prev, finalValue];
          if (newRolls.length === 3) {
            // All rolls complete
            setIsComplete(true);
          }
          return newRolls;
        });

        setCurrentRollIndex((prev) => prev + 1);
      }
    }, 50);
  }, []);

  // Auto-roll for initiator
  useEffect(() => {
    if (
      isOpen &&
      harbingerDiceState?.isLocalInitiator &&
      harbingerDiceState?.phase === 'rolling' &&
      currentRollIndex < 3 &&
      !diceSlots[currentRollIndex]?.isRolling &&
      diceSlots[currentRollIndex]?.value === null
    ) {
      // Small delay before starting next roll
      const timer = setTimeout(() => {
        rollDie(currentRollIndex, finalRolls);
      }, currentRollIndex === 0 ? 500 : 800);

      return () => clearTimeout(timer);
    }
  }, [
    isOpen,
    harbingerDiceState,
    currentRollIndex,
    diceSlots,
    finalRolls,
    rollDie,
  ]);

  // Auto-complete when all rolls are done (initiator only)
  useEffect(() => {
    if (isComplete && finalRolls.length === 3 && harbingerDiceState?.isLocalInitiator) {
      const positions = finalRolls.map((roll) => {
        const pos = diceValueToPosition(roll);
        return positionKey(pos.row, pos.col);
      });

      // Brief delay to show results before completing
      const timer = setTimeout(() => {
        onComplete(finalRolls, positions);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isComplete, finalRolls, harbingerDiceState?.isLocalInitiator, onComplete]);

  if (!isOpen || !harbingerDiceState) return null;

  const getPositionLabel = (roll: number): string => {
    const pos = diceValueToPosition(roll);
    return `Row ${pos.row + 1}, Col ${pos.col + 1}`;
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div
        className="bg-gray-900 rounded-lg p-8 max-w-lg w-full mx-4 shadow-2xl border border-purple-500/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <CthulhuMarker size={32} />
          <h2 className="text-2xl font-bold text-purple-300">
            Harbinger Awakens
          </h2>
          <CthulhuMarker size={32} />
        </div>

        <p className="text-gray-400 text-center mb-6">
          Rolling for Cthulhu marker positions...
        </p>

        {/* Dice slots */}
        <div className="flex justify-center gap-6 mb-8">
          {diceSlots.map((slot, index) => (
            <div key={index} className="flex flex-col items-center">
              <div
                className={`
                  w-20 h-20 rounded-lg flex items-center justify-center text-3xl font-bold
                  transition-all duration-300
                  ${slot.isRolling ? 'bg-purple-900 animate-pulse' : ''}
                  ${slot.value !== null ? 'bg-purple-700 shadow-lg shadow-purple-500/50' : 'bg-gray-700'}
                  ${index === currentRollIndex && slot.value === null ? 'ring-2 ring-purple-400' : ''}
                `}
              >
                {slot.value !== null || slot.isRolling ? (
                  <span className={slot.isRolling ? 'animate-bounce' : ''}>
                    {slot.displayValue}
                  </span>
                ) : (
                  <span className="text-gray-500">?</span>
                )}
              </div>
              {slot.value !== null && (
                <div className="text-xs text-green-400 mt-2 text-center">
                  {getPositionLabel(slot.value)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Status */}
        <div className="text-center">
          {!isComplete && harbingerDiceState.isLocalInitiator && (
            <p className="text-purple-300">
              Rolling die {currentRollIndex + 1} of 3...
            </p>
          )}
          {!isComplete && !harbingerDiceState.isLocalInitiator && (
            <p className="text-purple-300">
              Opponent is rolling...
            </p>
          )}
          {isComplete && (
            <div className="space-y-3">
              <p className="text-green-400 font-semibold">
                Markers will be placed at positions {finalRolls.join(', ')}
              </p>
              {harbingerDiceState.phase === 'complete' && (
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors"
                >
                  Continue
                </button>
              )}
            </div>
          )}
        </div>

        <p className="text-gray-500 text-xs text-center mt-6">
          Three unique positions on the 4x5 board will receive Cthulhu markers
        </p>
      </div>
    </div>,
    document.body
  );
}
