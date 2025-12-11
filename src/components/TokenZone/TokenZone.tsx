import { useState } from 'react';
import { Player } from '../../types';
import { TokenModal } from './TokenModal';

interface TokenZoneProps {
  player: Player;
}

export function TokenZone({ player }: TokenZoneProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        style={{
          width: '150px',
          height: '36px',
          border: '1px solid #374151',
          borderRadius: '8px',
          backgroundColor: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'border-color 0.2s, background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#9ca3af';
          e.currentTarget.style.backgroundColor = '#374151';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#374151';
          e.currentTarget.style.backgroundColor = '#1f2937';
        }}
        title="Click to spawn tokens"
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#9ca3af',
          }}
        >
          Tokens
        </span>
      </div>

      <TokenModal
        isOpen={isModalOpen}
        player={player}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
