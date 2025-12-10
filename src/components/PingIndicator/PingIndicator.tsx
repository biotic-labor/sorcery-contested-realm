import { useMultiplayerStore } from '../../hooks/useMultiplayer';
import './PingIndicator.css';

export function PingIndicator() {
  const activePing = useMultiplayerStore((s) => s.activePing);

  if (!activePing) {
    return null;
  }

  const colorClass = activePing.isLocal ? 'ping-local' : 'ping-opponent';

  // Key forces React to recreate DOM element, restarting CSS animation
  return (
    <div key={activePing.timestamp}>
      <div
        className="ping-container"
        style={{
          left: activePing.x,
          top: activePing.y,
        }}
      >
        <div className={`ping-ring ping-ring-1 ${colorClass}`} />
        <div className={`ping-ring ping-ring-2 ${colorClass}`} />
        <div className={`ping-ring ping-ring-3 ${colorClass}`} />
      </div>
    </div>
  );
}
