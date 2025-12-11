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
  const fontSize = size === 'small' ? '18px' : '28px';
  const minWidth = size === 'small' ? '28px' : '40px';
  const height = size === 'small' ? '36px' : '48px';

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
        border: '1px solid #4b5563',
        borderRadius: '4px',
        backgroundColor: flash ? '#ffffff' : '#374151',
        transition: 'background-color 0.1s ease-out',
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
              borderBottom: '1px solid #4b5563',
            }}
            className="hover:bg-white/10 active:bg-white/20"
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
            className="hover:bg-white/10 active:bg-white/20"
          />
        </>
      )}
      <span style={{ fontSize, fontWeight: 'bold', color: flash ? '#1f2937' : color, pointerEvents: 'none', transition: 'color 0.1s ease-out' }}>
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
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: style.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 'bold',
          color: style.text,
        }}
      >
        {style.label}
      </div>
      <div
        style={{
          position: 'relative',
          minWidth: '20px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #4b5563',
          borderRadius: '4px',
          backgroundColor: '#374151',
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
              className="hover:bg-white/10 active:bg-white/20"
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
              className="hover:bg-white/10 active:bg-white/20"
            />
          </>
        )}
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: style.bg, pointerEvents: 'none' }}>
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
        backgroundColor: '#1f2937',
        borderRadius: '8px',
        padding: '12px',
        border: '1px solid #374151',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          fontWeight: 'bold',
          color: player === 'player' ? '#4ade80' : '#f87171',
          marginBottom: '8px',
          textAlign: 'center',
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        {/* Life */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '2px' }}>
            Life
          </div>
          <ClickableValue
            value={life}
            color="#ef4444"
            onIncrement={() => adjustLife(dataPlayer, 1)}
            onDecrement={() => adjustLife(dataPlayer, -1)}
            disabled={disabled}
          />
        </div>
        {/* Mana */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '2px' }}>
            Mana
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <ClickableValue
              value={mana}
              color="#3b82f6"
              size="small"
              onIncrement={() => adjustMana(dataPlayer, 1)}
              onDecrement={() => adjustMana(dataPlayer, -1)}
              disabled={disabled}
            />
            <span style={{ fontSize: '18px', color: '#6b7280' }}>/</span>
            <ClickableValue
              value={manaTotal}
              color="#60a5fa"
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
        width: '150px',
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
