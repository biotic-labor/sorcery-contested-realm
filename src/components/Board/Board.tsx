import { useState, useCallback } from 'react';
import { useGameStore } from '../../hooks/useGameState';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';
import { positionKey, vertexKey, parseVertexKey, CardInstance } from '../../types';
import { BoardSite } from './BoardSite';
import { BoardVertex } from './BoardVertex';

// Get the 4 site positions adjacent to a vertex
function getAdjacentSites(vertexId: string): Set<string> {
  const { row, col } = parseVertexKey(vertexId);
  return new Set([
    positionKey(row, col),
    positionKey(row, col + 1),
    positionKey(row + 1, col),
    positionKey(row + 1, col + 1),
  ]);
}

export function Board() {
  const [hoveredVertexId, setHoveredVertexId] = useState<string | null>(null);

  const {
    board,
    avatars,
    vertices,
    selectedCard,
    hoveredCard,
    selectCard,
    hoverCard,
  } = useGameStore();

  const { localPlayer, connectionStatus } = useMultiplayerStore();

  // In multiplayer, player 2 (opponent perspective) sees the board rotated 180 degrees
  const isRotated = connectionStatus === 'connected' && localPlayer === 'opponent';

  const handleCardClick = (card: CardInstance) => {
    selectCard(selectedCard?.id === card.id ? null : card);
  };

  const handleCardHover = (card: CardInstance | null) => {
    hoverCard(card);
  };

  const handleVertexHover = useCallback((vertexId: string | null) => {
    setHoveredVertexId(vertexId);
  }, []);

  // Calculate which sites should be highlighted due to vertex hover
  const highlightedSites = hoveredVertexId ? getAdjacentSites(hoveredVertexId) : new Set<string>();

  // Labels are outside the rotated board, so they stay fixed
  // Both players see "Opponent Side" at top, "Your Side" at bottom
  const topLabel = 'Opponent Side';
  const bottomLabel = 'Your Side';

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-sm text-gray-400 mb-2">
        {topLabel}
      </div>

      {/* Board container with relative positioning for vertices */}
      <div
        style={{
          position: 'relative',
          transform: isRotated ? 'rotate(180deg)' : undefined,
        }}
      >
        {/* 4 rows x 5 columns grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 160px)',
            gridTemplateRows: 'repeat(4, 120px)',
            gap: '8px',
            padding: '16px',
            backgroundColor: '#111827',
            borderRadius: '12px',
            border: '1px solid #374151',
            position: 'relative',
          }}
        >
          {board.map((row, rowIndex) =>
            row.map((site, colIndex) => {
              const isOpponentAvatarZone = rowIndex === 0 && colIndex === 2;
              const isPlayerAvatarZone = rowIndex === 3 && colIndex === 2;
              const isAvatarZone = isOpponentAvatarZone || isPlayerAvatarZone;
              const avatarZoneOwner = isOpponentAvatarZone ? 'opponent' : isPlayerAvatarZone ? 'player' : undefined;

              const siteKey = positionKey(rowIndex, colIndex);
              return (
                <BoardSite
                  key={siteKey}
                  site={site}
                  row={rowIndex}
                  col={colIndex}
                  avatar={avatars[siteKey]}
                  onCardClick={handleCardClick}
                  onCardHover={handleCardHover}
                  selectedCardId={selectedCard?.id}
                  hoveredCardId={hoveredCard?.id}
                  isAvatarZone={isAvatarZone}
                  avatarZoneOwner={avatarZoneOwner}
                  isHighlightedByVertex={highlightedSites.has(siteKey)}
                  labelCounterRotate={isRotated}
                />
              );
            })
          )}
        </div>

        {/* Vertices: 3 rows x 4 columns positioned at intersections */}
        {Array.from({ length: 3 }).map((_, vertexRow) =>
          Array.from({ length: 4 }).map((_, vertexCol) => {
            const vKey = vertexKey(vertexRow, vertexCol);
            const units = vertices[vKey] || [];

            // Calculate position: vertex (r,c) is at the intersection of sites (r,c), (r,c+1), (r+1,c), (r+1,c+1)
            // Site width: 160px, height: 120px, gap: 8px
            const siteWidth = 160;
            const siteHeight = 120;
            const gap = 8;
            const padding = 16;

            // Position vertex at the bottom-right corner of site (vertexRow, vertexCol)
            const left = padding + vertexCol * (siteWidth + gap) + siteWidth + gap / 2;
            const top = padding + vertexRow * (siteHeight + gap) + siteHeight + gap / 2;

            return (
              <div
                key={vKey}
                style={{
                  position: 'absolute',
                  left: `${left}px`,
                  top: `${top}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 20,
                }}
              >
                <BoardVertex
                  row={vertexRow}
                  col={vertexCol}
                  units={units}
                  onCardClick={handleCardClick}
                  onCardHover={handleCardHover}
                  onVertexHover={handleVertexHover}
                  selectedCardId={selectedCard?.id}
                  hoveredCardId={hoveredCard?.id}
                />
              </div>
            );
          })
        )}
      </div>

      <div className="text-sm text-gray-400 mt-2">
        {bottomLabel}
      </div>
    </div>
  );
}
