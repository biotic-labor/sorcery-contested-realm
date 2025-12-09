import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  positionKey,
  parsePositionKey,
  vertexKey,
  parseVertexKey,
} from '../game';

describe('game type helpers', () => {
  describe('positionKey', () => {
    it('creates key from row and column', () => {
      expect(positionKey(0, 0)).toBe('0-0');
      expect(positionKey(1, 2)).toBe('1-2');
      expect(positionKey(3, 4)).toBe('3-4');
    });

    it('handles edge cases of the 4x5 board', () => {
      expect(positionKey(0, 0)).toBe('0-0');
      expect(positionKey(0, 4)).toBe('0-4');
      expect(positionKey(3, 0)).toBe('3-0');
      expect(positionKey(3, 4)).toBe('3-4');
    });
  });

  describe('parsePositionKey', () => {
    it('parses key back to row and column', () => {
      expect(parsePositionKey('0-0')).toEqual({ row: 0, col: 0 });
      expect(parsePositionKey('1-2')).toEqual({ row: 1, col: 2 });
      expect(parsePositionKey('3-4')).toEqual({ row: 3, col: 4 });
    });

    it('is inverse of positionKey', () => {
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
          const key = positionKey(row, col);
          const parsed = parsePositionKey(key);
          expect(parsed).toEqual({ row, col });
        }
      }
    });
  });

  describe('vertexKey', () => {
    it('creates vertex key with v- prefix', () => {
      expect(vertexKey(0, 0)).toBe('v-0-0');
      expect(vertexKey(1, 2)).toBe('v-1-2');
      expect(vertexKey(2, 3)).toBe('v-2-3');
    });

    it('handles edge cases of the 3x4 vertex grid', () => {
      expect(vertexKey(0, 0)).toBe('v-0-0');
      expect(vertexKey(0, 3)).toBe('v-0-3');
      expect(vertexKey(2, 0)).toBe('v-2-0');
      expect(vertexKey(2, 3)).toBe('v-2-3');
    });
  });

  describe('parseVertexKey', () => {
    it('parses vertex key back to row and column', () => {
      expect(parseVertexKey('v-0-0')).toEqual({ row: 0, col: 0 });
      expect(parseVertexKey('v-1-2')).toEqual({ row: 1, col: 2 });
      expect(parseVertexKey('v-2-3')).toEqual({ row: 2, col: 3 });
    });

    it('is inverse of vertexKey', () => {
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          const key = vertexKey(row, col);
          const parsed = parseVertexKey(key);
          expect(parsed).toEqual({ row, col });
        }
      }
    });
  });

  describe('createEmptyBoard', () => {
    it('creates a 4x5 grid', () => {
      const board = createEmptyBoard();
      expect(board).toHaveLength(4);
      board.forEach((row) => {
        expect(row).toHaveLength(5);
      });
    });

    it('initializes each cell with null siteCard and empty arrays', () => {
      const board = createEmptyBoard();
      board.forEach((row) => {
        row.forEach((cell) => {
          expect(cell.siteCard).toBeNull();
          expect(cell.units).toEqual([]);
          expect(cell.underCards).toEqual([]);
        });
      });
    });

    it('creates independent cell objects (not shared references)', () => {
      const board = createEmptyBoard();
      // Modify one cell's units array
      board[0][0].units.push({} as never);

      // Other cells should not be affected
      expect(board[0][1].units).toEqual([]);
      expect(board[1][0].units).toEqual([]);
    });

    it('creates independent row arrays (not shared references)', () => {
      const board = createEmptyBoard();
      // Modify first row
      board[0].push({} as never);

      // Other rows should not be affected
      expect(board[1]).toHaveLength(5);
    });
  });
});
