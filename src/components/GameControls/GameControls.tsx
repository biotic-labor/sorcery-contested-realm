import { useGameStore } from '../../hooks/useGameState';
import { useGameActions } from '../../hooks/useGameActions';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';

export function GameControls() {
  // Read-only state from store
  const { currentTurn, turnNumber, turnStarted } = useGameStore();

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

  // Disable Start Turn if not my turn (multiplayer) or turn already started
  const startTurnDisabled = (isMultiplayer && !isMyTurn) || turnStarted;

  // When clicking Start Turn, we need to pass the data player
  const handleStartTurn = () => {
    // Start turn for whoever's turn it currently is (data perspective)
    startTurn(currentTurn);
  };

  return (
    <div
      style={{
        background: 'var(--parchment-bg)',
        border: '2px solid var(--parchment-border)',
        borderRadius: '8px',
        padding: '8px',
        fontFamily: 'var(--font-medieval)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        width: 'var(--preview-size)',
      }}
    >
      {/* Turn indicator */}
      <div style={{
        textAlign: 'center',
        marginBottom: '6px',
        fontSize: '11px',
        color: 'var(--parchment-text-light)',
        letterSpacing: '0.05em',
      }}>
        <span style={{ marginRight: '8px' }}>Turn {turnNumber}</span>
        <span style={{
          fontWeight: '700',
          color: isMyTurn ? '#2d5a27' : '#8b2942',
        }}>
          {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
        </span>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={handleStartTurn}
          disabled={startTurnDisabled}
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: '11px',
            fontWeight: '600',
            fontFamily: 'var(--font-medieval)',
            border: '1px solid',
            borderRadius: '4px',
            cursor: startTurnDisabled ? 'not-allowed' : 'pointer',
            backgroundColor: startTurnDisabled ? '#c4b393' : '#3b6ea5',
            borderColor: startTurnDisabled ? '#a89b7a' : '#2a5280',
            color: startTurnDisabled ? '#8b7355' : '#fff',
            textShadow: startTurnDisabled ? 'none' : '0 1px 1px rgba(0,0,0,0.3)',
            transition: 'background-color 0.15s',
          }}
        >
          Start
        </button>
        <button
          onClick={endTurn}
          disabled={!turnStarted || (isMultiplayer && !isMyTurn)}
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: '11px',
            fontWeight: '600',
            fontFamily: 'var(--font-medieval)',
            border: '1px solid',
            borderRadius: '4px',
            cursor: (!turnStarted || (isMultiplayer && !isMyTurn)) ? 'not-allowed' : 'pointer',
            backgroundColor: (!turnStarted || (isMultiplayer && !isMyTurn)) ? '#c4b393' : '#2d5a27',
            borderColor: (!turnStarted || (isMultiplayer && !isMyTurn)) ? '#a89b7a' : '#1e4a1a',
            color: (!turnStarted || (isMultiplayer && !isMyTurn)) ? '#8b7355' : '#fff',
            textShadow: (!turnStarted || (isMultiplayer && !isMyTurn)) ? 'none' : '0 1px 1px rgba(0,0,0,0.3)',
            transition: 'background-color 0.15s',
          }}
        >
          End Turn
        </button>
      </div>
    </div>
  );
}
