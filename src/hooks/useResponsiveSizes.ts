import { useState, useEffect } from 'react';

export interface BoardSizes {
  cellWidth: number;
  cellHeight: number;
  gap: number;
  padding: number;
}

function getCSSVariable(name: string): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return parseInt(value, 10) || 0;
}

function getBoardSizes(): BoardSizes {
  return {
    cellWidth: getCSSVariable('--board-cell-width'),
    cellHeight: getCSSVariable('--board-cell-height'),
    gap: getCSSVariable('--board-gap'),
    padding: getCSSVariable('--board-padding'),
  };
}

export function useResponsiveSizes(): BoardSizes {
  const [sizes, setSizes] = useState<BoardSizes>(() => {
    // SSR safety - return defaults if document not available
    if (typeof document === 'undefined') {
      return { cellWidth: 160, cellHeight: 120, gap: 8, padding: 16 };
    }
    return getBoardSizes();
  });

  useEffect(() => {
    const updateSizes = () => {
      setSizes(getBoardSizes());
    };

    // Update on mount
    updateSizes();

    // Update on resize (media query changes for all breakpoints)
    const mediaQueries = [
      window.matchMedia('(min-width: 1600px)'),
      window.matchMedia('(min-width: 1920px)'),
    ];

    mediaQueries.forEach(mq => mq.addEventListener('change', updateSizes));
    window.addEventListener('resize', updateSizes);

    return () => {
      mediaQueries.forEach(mq => mq.removeEventListener('change', updateSizes));
      window.removeEventListener('resize', updateSizes);
    };
  }, []);

  return sizes;
}
