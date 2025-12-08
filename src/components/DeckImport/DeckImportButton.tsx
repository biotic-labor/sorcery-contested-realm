import { useState } from 'react';
import { DeckImportModal } from './DeckImportModal';
import type { Player } from '../../types';

interface DeckImportButtonProps {
  player: Player;
}

export function DeckImportButton({ player }: DeckImportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md transition-colors flex items-center gap-1.5"
        title="Import deck from Curiosa.io"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        Import
      </button>

      <DeckImportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        player={player}
      />
    </>
  );
}
