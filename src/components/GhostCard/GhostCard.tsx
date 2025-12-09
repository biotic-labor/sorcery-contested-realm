import { useMultiplayerStore } from '../../hooks/useMultiplayer';
import { Card, CardBack } from '../Card';
import { CardInstance } from '../../types';

interface GhostCardProps {
  isLocalDragging?: boolean;
}

/**
 * Renders a semi-transparent "ghost" card showing where the opponent
 * is currently dragging a card. Position is broadcast over P2P.
 */
export function GhostCard({ isLocalDragging = false }: GhostCardProps) {
  const { opponentDrag, connectionStatus, localPlayer } = useMultiplayerStore();

  // Only show in multiplayer when opponent is dragging and we're not dragging ourselves
  if (connectionStatus !== 'connected' || !opponentDrag || isLocalDragging) {
    return null;
  }

  // Transform coordinates based on player perspective
  // When board is rotated for player 2, we need to adjust the ghost position
  const isRotated = localPlayer === 'opponent';

  // Position calculation - opponent's screen coords to our screen coords
  // This is approximate since screen sizes may differ
  const x = isRotated ? window.innerWidth - opponentDrag.x : opponentDrag.x;
  const y = isRotated ? window.innerHeight - opponentDrag.y : opponentDrag.y;

  // If cardData is not provided (hidden zone like hand), show a card back
  const isHiddenCard = !opponentDrag.cardData;

  // Create a temporary card instance for rendering (only if we have card data)
  const ghostCard: CardInstance | null = opponentDrag.cardData
    ? {
        id: `ghost-${opponentDrag.cardId}`,
        cardData: opponentDrag.cardData,
        variant: {
          slug: opponentDrag.cardData.sets?.[0]?.variants?.[0]?.slug || 'unknown',
          finish: 'Standard',
          product: '',
          artist: '',
          flavorText: '',
          typeText: '',
        },
        rotation: 0,
        owner: localPlayer === 'player' ? 'opponent' : 'player',
      }
    : null;

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        opacity: 0.6,
        filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))',
      }}
    >
      {isHiddenCard ? (
        <CardBack size="small" deckType="spell" />
      ) : (
        <Card card={ghostCard!} size="small" />
      )}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-blue-400 whitespace-nowrap bg-gray-900 px-2 py-0.5 rounded">
        Opponent dragging
      </div>
    </div>
  );
}
