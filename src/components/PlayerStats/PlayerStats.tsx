import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../hooks/useGameState';
import { useGameActions } from '../../hooks/useGameActions';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';
import { Player, Thresholds } from '../../types';

interface ClickableValueProps {
  value: number;
  color: string;
  onIncrement: () => void;
  onDecrement: () => void;
  size?: 'normal' | 'small';
  disabled?: boolean;
}

function ClickableValue({ value, color, onIncrement, onDecrement, size = 'normal', disabled = false }: ClickableValueProps) {
  const fontSize = size === 'small' ? 'var(--stats-value-small-size)' : 'var(--stats-value-size)';
  const minWidth = size === 'small' ? 'var(--stats-value-small-width)' : 'var(--stats-value-width)';
  const height = size === 'small' ? 'var(--stats-value-small-height)' : 'var(--stats-value-height)';

  // Flash effect when value changes
  const [flash, setFlash] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 200);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <div
      style={{
        position: 'relative',
        minWidth,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        border: '2px solid var(--parchment-border-dark)',
        borderRadius: '4px',
        background: flash ? '#fff8e7' : 'linear-gradient(180deg, #f5edd6 0%, #e8ddc4 100%)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1), 0 1px 0 rgba(255,255,255,0.5)',
        transition: 'background 0.1s ease-out',
        fontFamily: 'var(--font-medieval)',
      }}
    >
      {!disabled && (
        <>
          <div
            onClick={onIncrement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50%',
              cursor: 'pointer',
              borderBottom: '1px solid var(--parchment-border)',
            }}
            className="hover:bg-black/5 active:bg-black/10"
          />
          <div
            onClick={onDecrement}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '50%',
              cursor: 'pointer',
            }}
            className="hover:bg-black/5 active:bg-black/10"
          />
        </>
      )}
      <span style={{
        fontSize,
        fontWeight: '700',
        color: flash ? 'var(--parchment-text)' : color,
        pointerEvents: 'none',
        transition: 'color 0.1s ease-out',
        textShadow: '0 1px 0 rgba(255,255,255,0.5)',
      }}>
        {value}
      </span>
    </div>
  );
}

interface ThresholdBadgeProps {
  element: 'air' | 'earth' | 'fire' | 'water';
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}

const ELEMENT_STYLES = {
  air: { bg: '#22d3ee', text: '#0e7490', label: 'A' },
  water: { bg: '#3b82f6', text: '#1e40af', label: 'W' },
  earth: { bg: '#a16207', text: '#fef3c7', label: 'E' },
  fire: { bg: '#f97316', text: '#9a3412', label: 'F' },
};

function ThresholdBadge({ element, value, onIncrement, onDecrement, disabled = false }: ThresholdBadgeProps) {
  const style = ELEMENT_STYLES[element];
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        userSelect: 'none',
      }}
      title={element.charAt(0).toUpperCase() + element.slice(1)}
    >
      <div
        style={{
          width: 'var(--stats-threshold-badge-size)',
          height: 'var(--stats-threshold-badge-size)',
          borderRadius: '50%',
          backgroundColor: style.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'calc(var(--stats-threshold-badge-size) * 0.625)',
          fontWeight: 'bold',
          color: style.text,
          fontFamily: 'var(--font-medieval)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
          border: '1px solid rgba(0,0,0,0.2)',
        }}
      >
        {style.label}
      </div>
      <div
        style={{
          position: 'relative',
          minWidth: 'var(--stats-threshold-value-width)',
          height: 'var(--stats-threshold-value-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--parchment-border)',
          borderRadius: '4px',
          background: 'linear-gradient(180deg, #f5edd6 0%, #e8ddc4 100%)',
          boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.1)',
        }}
      >
        {!disabled && (
          <>
            <div
              onClick={onIncrement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '50%',
                cursor: 'pointer',
              }}
              className="hover:bg-black/5 active:bg-black/10"
            />
            <div
              onClick={onDecrement}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '50%',
                cursor: 'pointer',
              }}
              className="hover:bg-black/5 active:bg-black/10"
            />
          </>
        )}
        <span style={{
          fontSize: 'calc(var(--stats-threshold-value-height) * 0.5)',
          fontWeight: '700',
          color: style.bg,
          pointerEvents: 'none',
          fontFamily: 'var(--font-medieval)',
          textShadow: '0 1px 0 rgba(255,255,255,0.5)',
        }}>
          {value}
        </span>
      </div>
    </div>
  );
}

interface PlayerStatBlockProps {
  player: Player;
  label: string;
  life: number;
  mana: number;
  manaTotal: number;
  thresholds: Thresholds;
  dataPlayer: Player; // The actual player in game state (for actions)
  disabled?: boolean; // Disable controls (for opponent stats in multiplayer)
}

function PlayerStatBlock({ player, label, life, mana, manaTotal, thresholds, dataPlayer, disabled = false }: PlayerStatBlockProps) {
  // Broadcasted actions
  const { adjustLife, adjustMana, adjustManaTotal, adjustThreshold } = useGameActions();

  return (
    <div
      style={{
        background: 'var(--parchment-bg)',
        borderRadius: '8px',
        padding: 'var(--stats-padding)',
        border: '2px solid var(--parchment-border)',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.3)',
        fontFamily: 'var(--font-medieval)',
      }}
    >
      <div
        style={{
          fontSize: 'var(--stats-label-size)',
          fontWeight: '700',
          color: player === 'player' ? '#2d5a27' : '#8b2942',
          marginBottom: '8px',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          textShadow: '0 1px 0 rgba(255,255,255,0.3)',
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        {/* Life */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 'calc(var(--stats-label-size) * 0.83)',
            color: 'var(--parchment-text-light)',
            textTransform: 'uppercase',
            marginBottom: '2px',
            letterSpacing: '0.05em',
          }}>
            Life
          </div>
          <ClickableValue
            value={life}
            color="#8b2942"
            onIncrement={() => adjustLife(dataPlayer, 1)}
            onDecrement={() => adjustLife(dataPlayer, -1)}
            disabled={disabled}
          />
        </div>
        {/* Mana */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 'calc(var(--stats-label-size) * 0.83)',
            color: 'var(--parchment-text-light)',
            textTransform: 'uppercase',
            marginBottom: '2px',
            letterSpacing: '0.05em',
          }}>
            Mana
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <ClickableValue
              value={mana}
              color="#1e4a7a"
              size="small"
              onIncrement={() => adjustMana(dataPlayer, 1)}
              onDecrement={() => adjustMana(dataPlayer, -1)}
              disabled={disabled}
            />
            <span style={{ fontSize: 'var(--stats-value-small-size)', color: 'var(--parchment-text-light)', fontWeight: '600' }}>/</span>
            <ClickableValue
              value={manaTotal}
              color="#2a5a8a"
              size="small"
              onIncrement={() => adjustManaTotal(dataPlayer, 1)}
              onDecrement={() => adjustManaTotal(dataPlayer, -1)}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
      {/* Thresholds */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
        <ThresholdBadge
          element="air"
          value={thresholds.air}
          onIncrement={() => adjustThreshold(dataPlayer, 'air', 1)}
          onDecrement={() => adjustThreshold(dataPlayer, 'air', -1)}
          disabled={disabled}
        />
        <ThresholdBadge
          element="water"
          value={thresholds.water}
          onIncrement={() => adjustThreshold(dataPlayer, 'water', 1)}
          onDecrement={() => adjustThreshold(dataPlayer, 'water', -1)}
          disabled={disabled}
        />
        <ThresholdBadge
          element="earth"
          value={thresholds.earth}
          onIncrement={() => adjustThreshold(dataPlayer, 'earth', 1)}
          onDecrement={() => adjustThreshold(dataPlayer, 'earth', -1)}
          disabled={disabled}
        />
        <ThresholdBadge
          element="fire"
          value={thresholds.fire}
          onIncrement={() => adjustThreshold(dataPlayer, 'fire', 1)}
          onDecrement={() => adjustThreshold(dataPlayer, 'fire', -1)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export function PlayerStats() {
  // Read-only state from store
  const {
    playerLife,
    opponentLife,
    playerMana,
    playerManaTotal,
    opponentMana,
    opponentManaTotal,
    playerThresholds,
    opponentThresholds,
  } = useGameStore();

  // Perspective mapping for multiplayer
  const { localPlayer, connectionStatus } = useMultiplayerStore();
  const isMultiplayer = connectionStatus === 'connected';
  const isGuest = isMultiplayer && localPlayer === 'opponent';

  // Map UI positions to data players
  // "my" stats (bottom) = localPlayer's stats
  // "their" stats (top) = opponent's stats
  const myLife = isGuest ? opponentLife : playerLife;
  const myMana = isGuest ? opponentMana : playerMana;
  const myManaTotal = isGuest ? opponentManaTotal : playerManaTotal;
  const myThresholds = isGuest ? opponentThresholds : playerThresholds;

  const theirLife = isGuest ? playerLife : opponentLife;
  const theirMana = isGuest ? playerMana : opponentMana;
  const theirManaTotal = isGuest ? playerManaTotal : opponentManaTotal;
  const theirThresholds = isGuest ? playerThresholds : opponentThresholds;

  // Data player for actions (which slot in state to modify)
  const myDataPlayer: Player = isGuest ? 'opponent' : 'player';
  const theirDataPlayer: Player = isGuest ? 'player' : 'opponent';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: 'var(--stats-width)',
      }}
    >
      <PlayerStatBlock
        player="opponent"
        label="Opponent"
        life={theirLife}
        mana={theirMana}
        manaTotal={theirManaTotal}
        thresholds={theirThresholds}
        dataPlayer={theirDataPlayer}
        disabled={isMultiplayer}
      />
      <PlayerStatBlock
        player="player"
        label="You"
        life={myLife}
        mana={myMana}
        manaTotal={myManaTotal}
        thresholds={myThresholds}
        dataPlayer={myDataPlayer}
      />
    </div>
  );
}
