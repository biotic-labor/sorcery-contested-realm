import { useEffect, useRef, useState } from 'react';

interface CardContextMenuProps {
  x: number;
  y: number;
  hasCounter: boolean;
  onAddCounter: () => void;
  onRemoveCounter: () => void;
  onClose: () => void;
}

export function CardContextMenu({ x, y, hasCounter, onAddCounter, onRemoveCounter, onClose }: CardContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu on screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let newX = x;
      let newY = y;

      if (x + rect.width > window.innerWidth) {
        newX = window.innerWidth - rect.width - 8;
      }
      if (y + rect.height > window.innerHeight) {
        newY = window.innerHeight - rect.height - 8;
      }

      if (newX !== x || newY !== y) {
        setPosition({ x: newX, y: newY });
      }
    }
  }, [x, y]);

  const buttonStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '8px 12px',
    textAlign: 'left',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#e5e7eb',
    cursor: 'pointer',
    fontSize: '14px',
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        backgroundColor: '#1f2937',
        border: '1px solid #374151',
        borderRadius: '6px',
        padding: '4px 0',
        minWidth: '140px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      <button
        onClick={() => {
          onAddCounter();
          onClose();
        }}
        style={buttonStyle}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#374151')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        Add Counter
      </button>
      {hasCounter && (
        <button
          onClick={() => {
            onRemoveCounter();
            onClose();
          }}
          style={buttonStyle}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#374151')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          Remove Counter
        </button>
      )}
    </div>
  );
}
