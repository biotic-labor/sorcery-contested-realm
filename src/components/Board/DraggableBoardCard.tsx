import { useDraggable } from '@dnd-kit/core';
import { CardInstance } from '../../types';
import { Card } from '../Card';
import { useMultiplayerStore } from '../../hooks/useMultiplayer';

// Draggable attachment component
interface DraggableAttachmentProps {
  attachment: CardInstance;
  hostCardId: string;
  sourcePosition: string;
  index: number;
  onHover?: (card: CardInstance | null) => void;
}

function DraggableAttachment({
  attachment,
  hostCardId,
  sourcePosition,
  index,
  onHover,
}: DraggableAttachmentProps) {
  const { localPlayer, connectionStatus } = useMultiplayerStore();
  const isMultiplayer = connectionStatus === 'connected';
  const isMyCard = attachment.owner === localPlayer;
  const canDrag = !isMultiplayer || isMyCard;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `attachment-${attachment.id}`,
    data: {
      card: attachment,
      source: 'attachment',
      sourcePosition,
      hostCardId,
    },
    disabled: !canDrag,
  });

  const isTapped = attachment.rotation === 90;
  const rotationTransform = isTapped ? 'rotate(90deg)' : '';
  const dragTransform = transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : '';
  const combinedTransform = [dragTransform, rotationTransform].filter(Boolean).join(' ') || undefined;

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        bottom: `${4 + index * 20}px`,
        right: `${4 + index * 12}px`,
        zIndex: transform ? 1000 : 50 + index,
        transform: combinedTransform,
        transition: 'transform 0.15s ease',
      }}
      {...listeners}
      {...attributes}
      className={`cursor-grab ${isDragging ? 'opacity-50' : ''}`}
      onMouseEnter={() => onHover?.(attachment)}
      onMouseLeave={() => onHover?.(null)}
    >
      <Card
        card={attachment}
        size="xsmall"
        showAsHorizontal={false}
      />
    </div>
  );
}

interface DraggableBoardCardProps {
  card: CardInstance;
  sourcePosition: string; // "row-col" format
  onClick?: () => void;
  onHover?: (card: CardInstance | null) => void;
  isHovered?: boolean;
  showAsHorizontal?: boolean;
  isOpponentCard?: boolean; // Rotate 180deg if this card belongs to opponent
  onContextMenu?: (e: React.MouseEvent, card: CardInstance) => void;
  onCounterIncrement?: () => void;
  onCounterDecrement?: () => void;
  isAttachmentTarget?: boolean; // Highlight when token will attach to this card
}

export function DraggableBoardCard({
  card,
  sourcePosition,
  onClick,
  onHover,
  isHovered,
  showAsHorizontal,
  isOpponentCard = false,
  onContextMenu,
  onCounterIncrement,
  onCounterDecrement,
  isAttachmentTarget = false,
}: DraggableBoardCardProps) {
  // Check actual ownership for drag permission (not visual rotation)
  const { localPlayer, connectionStatus } = useMultiplayerStore();
  const isMultiplayer = connectionStatus === 'connected';
  const isMyCard = card.owner === localPlayer;
  const canDrag = !isMultiplayer || isMyCard;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `board-${card.id}`,
    data: { card, source: 'board', sourcePosition },
    disabled: !canDrag,
  });

  // Opponent's cards are rotated 180deg so they face the opponent
  const ownerRotation = isOpponentCard ? 'rotate(180deg)' : '';
  // Token cards use xsmall size unless: Site token or fullSize token (Bruin, Tawny)
  const isSiteToken = card.isToken && card.cardData.guardian.type === 'Site';
  const useXSmall = card.isToken && !isSiteToken && !card.isFullSizeToken;
  const style = transform
    ? {
        transform: `${ownerRotation} translate3d(${transform.x}px, ${transform.y}px, 0)`.trim(),
        zIndex: isDragging ? 1000 : undefined,
      }
    : ownerRotation
    ? { transform: ownerRotation }
    : undefined;

  const hasAttachments = card.attachments && card.attachments.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        relative
        ${isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-grab'}
      `}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e, card);
        }
      }}
    >
      <Card
        card={card}
        size={useXSmall ? "xsmall" : "small"}
        showAsHorizontal={showAsHorizontal}
        isHovered={isHovered}
        onClick={onClick}
        onMouseEnter={() => onHover?.(card)}
        onMouseLeave={() => onHover?.(null)}
        onCounterIncrement={onCounterIncrement}
        onCounterDecrement={onCounterDecrement}
      />
      {/* Attachment target highlight */}
      {isAttachmentTarget && (
        <div
          className="absolute inset-0 rounded-lg border-2 border-green-400 pointer-events-none"
          style={{ boxShadow: '0 0 8px rgba(74, 222, 128, 0.6)' }}
        />
      )}
      {/* Render attachments as draggable xsmall cards stacked bottom-right */}
      {hasAttachments && card.attachments!.map((att, idx) => (
        <DraggableAttachment
          key={att.id}
          attachment={att}
          hostCardId={card.id}
          sourcePosition={sourcePosition}
          index={idx}
          onHover={onHover}
        />
      ))}
    </div>
  );
}
