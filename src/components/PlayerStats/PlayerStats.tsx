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
}

function ClickableValue({ value, color, onIncrement, onDecrement, size = 'normal' }: ClickableValueProps) {
  const fontSize = size === 'small' ? '18px' : '28px';
  const minWidth = size === 'small' ? '28px' : '40px';
  const height = size === 'small' ? '36px' : '48px';

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
        backgroundColor: '#374151',
      }}
    >
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
      <span style={{ fontSize, fontWeight: 'bold', color, pointerEvents: 'none' }}>
        {value}
      </span>
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
}

function PlayerStatBlock({ player, label, life, mana, manaTotal, thresholds, dataPlayer }: PlayerStatBlockProps) {
  // Broadcasted actions
  const { adjustLife, adjustMana, adjustManaTotal } = useGameActions();

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
            />
            <span style={{ fontSize: '18px', color: '#6b7280' }}>/</span>
            <ClickableValue
              value={manaTotal}
              color="#60a5fa"
              size="small"
              onIncrement={() => adjustManaTotal(dataPlayer, 1)}
              onDecrement={() => adjustManaTotal(dataPlayer, -1)}
            />
          </div>
        </div>
      </div>
      {/* Thresholds */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
        {thresholds.air > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: '#22d3ee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#0e7490',
              }}
              title="Air"
            >
              A
            </div>
            <span style={{ fontSize: '12px', color: '#22d3ee', fontWeight: 'bold' }}>{thresholds.air}</span>
          </div>
        )}
        {thresholds.water > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#1e40af',
              }}
              title="Water"
            >
              W
            </div>
            <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 'bold' }}>{thresholds.water}</span>
          </div>
        )}
        {thresholds.earth > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#166534',
              }}
              title="Earth"
            >
              E
            </div>
            <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 'bold' }}>{thresholds.earth}</span>
          </div>
        )}
        {thresholds.fire > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: '#f97316',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#9a3412',
              }}
              title="Fire"
            >
              F
            </div>
            <span style={{ fontSize: '12px', color: '#f97316', fontWeight: 'bold' }}>{thresholds.fire}</span>
          </div>
        )}
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
