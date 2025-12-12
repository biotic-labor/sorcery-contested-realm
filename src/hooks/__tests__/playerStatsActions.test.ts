import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../useGameState';

describe('playerStatsActions', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe('adjustLife', () => {
    it('increases player life', () => {
      const initial = useGameStore.getState().playerLife;

      useGameStore.getState().adjustLife('player', 5);

      expect(useGameStore.getState().playerLife).toBe(initial + 5);
    });

    it('decreases player life', () => {
      const initial = useGameStore.getState().playerLife;

      useGameStore.getState().adjustLife('player', -3);

      expect(useGameStore.getState().playerLife).toBe(initial - 3);
    });

    it('adjusts opponent life', () => {
      const initial = useGameStore.getState().opponentLife;

      useGameStore.getState().adjustLife('opponent', -10);

      expect(useGameStore.getState().opponentLife).toBe(initial - 10);
    });

    it('allows negative life', () => {
      useGameStore.setState({ playerLife: 5 });

      useGameStore.getState().adjustLife('player', -10);

      expect(useGameStore.getState().playerLife).toBe(-5);
    });
  });

  describe('adjustMana', () => {
    it('increases player mana', () => {
      useGameStore.setState({ playerMana: 5 });

      useGameStore.getState().adjustMana('player', 2);

      expect(useGameStore.getState().playerMana).toBe(7);
    });

    it('decreases player mana', () => {
      useGameStore.setState({ playerMana: 5 });

      useGameStore.getState().adjustMana('player', -3);

      expect(useGameStore.getState().playerMana).toBe(2);
    });

    it('does not go below 0', () => {
      useGameStore.setState({ playerMana: 2 });

      useGameStore.getState().adjustMana('player', -5);

      expect(useGameStore.getState().playerMana).toBe(0);
    });

    it('adjusts opponent mana', () => {
      useGameStore.setState({ opponentMana: 3 });

      useGameStore.getState().adjustMana('opponent', 4);

      expect(useGameStore.getState().opponentMana).toBe(7);
    });
  });

  describe('adjustManaTotal', () => {
    it('increases player mana total', () => {
      useGameStore.setState({ playerManaTotal: 5 });

      useGameStore.getState().adjustManaTotal('player', 2);

      expect(useGameStore.getState().playerManaTotal).toBe(7);
    });

    it('does not go below 0', () => {
      useGameStore.setState({ playerManaTotal: 2 });

      useGameStore.getState().adjustManaTotal('player', -5);

      expect(useGameStore.getState().playerManaTotal).toBe(0);
    });

    it('adjusts opponent mana total', () => {
      useGameStore.setState({ opponentManaTotal: 3 });

      useGameStore.getState().adjustManaTotal('opponent', 2);

      expect(useGameStore.getState().opponentManaTotal).toBe(5);
    });
  });

  describe('adjustThreshold', () => {
    it('increases player air threshold', () => {
      useGameStore.setState({ playerThresholds: { air: 1, earth: 0, fire: 0, water: 0 } });

      useGameStore.getState().adjustThreshold('player', 'air', 2);

      expect(useGameStore.getState().playerThresholds.air).toBe(3);
    });

    it('increases player fire threshold', () => {
      useGameStore.setState({ playerThresholds: { air: 0, earth: 0, fire: 1, water: 0 } });

      useGameStore.getState().adjustThreshold('player', 'fire', 1);

      expect(useGameStore.getState().playerThresholds.fire).toBe(2);
    });

    it('decreases threshold', () => {
      useGameStore.setState({ playerThresholds: { air: 3, earth: 0, fire: 0, water: 0 } });

      useGameStore.getState().adjustThreshold('player', 'air', -2);

      expect(useGameStore.getState().playerThresholds.air).toBe(1);
    });

    it('does not go below 0', () => {
      useGameStore.setState({ playerThresholds: { air: 1, earth: 0, fire: 0, water: 0 } });

      useGameStore.getState().adjustThreshold('player', 'air', -5);

      expect(useGameStore.getState().playerThresholds.air).toBe(0);
    });

    it('adjusts opponent threshold', () => {
      useGameStore.setState({ opponentThresholds: { air: 0, earth: 2, fire: 0, water: 0 } });

      useGameStore.getState().adjustThreshold('opponent', 'earth', 3);

      expect(useGameStore.getState().opponentThresholds.earth).toBe(5);
    });

    it('preserves other thresholds when adjusting one', () => {
      useGameStore.setState({ playerThresholds: { air: 1, earth: 2, fire: 3, water: 4 } });

      useGameStore.getState().adjustThreshold('player', 'water', 1);

      const thresholds = useGameStore.getState().playerThresholds;
      expect(thresholds.air).toBe(1);
      expect(thresholds.earth).toBe(2);
      expect(thresholds.fire).toBe(3);
      expect(thresholds.water).toBe(5);
    });
  });
});
