import { GameState, CardInstance, BoardPosition } from '../../../types';

type SetState = (fn: (state: GameState) => Partial<GameState>) => void;

export interface BoardActions {
  placeCardOnSite: (card: CardInstance, position: BoardPosition) => void;
  placeUnitOnSite: (card: CardInstance, position: BoardPosition) => void;
  placeUnitOnVertex: (card: CardInstance, vertexKey: string) => void;
  removeCardFromVertex: (cardId: string, vertexKey: string) => void;
  moveCard: (cardId: string, from: BoardPosition, to: BoardPosition) => void;
  removeCardFromBoard: (cardId: string, position: BoardPosition) => void;
  placeAvatar: (card: CardInstance, position: BoardPosition) => void;
  raiseUnit: (cardId: string, position: BoardPosition) => void;
}

export function createBoardActions(set: SetState): BoardActions {
  return {
    placeCardOnSite: (card, position) => {
      set((state) => {
        const newBoard = [...state.board.map((row) => [...row.map((site) => ({ ...site }))])];
        newBoard[position.row][position.col].siteCard = card;

        const siteThresholds = card.cardData.guardian.thresholds;

        if (card.owner === 'player') {
          return {
            board: newBoard,
            playerMana: state.playerMana + 1,
            playerManaTotal: state.playerManaTotal + 1,
            playerThresholds: {
              air: state.playerThresholds.air + siteThresholds.air,
              earth: state.playerThresholds.earth + siteThresholds.earth,
              fire: state.playerThresholds.fire + siteThresholds.fire,
              water: state.playerThresholds.water + siteThresholds.water,
            },
          };
        } else {
          return {
            board: newBoard,
            opponentMana: state.opponentMana + 1,
            opponentManaTotal: state.opponentManaTotal + 1,
            opponentThresholds: {
              air: state.opponentThresholds.air + siteThresholds.air,
              earth: state.opponentThresholds.earth + siteThresholds.earth,
              fire: state.opponentThresholds.fire + siteThresholds.fire,
              water: state.opponentThresholds.water + siteThresholds.water,
            },
          };
        }
      });
    },

    placeUnitOnSite: (card, position) => {
      set((state) => {
        const newBoard = [...state.board.map((row) => [...row.map((site) => ({ ...site, units: [...site.units] }))])];
        newBoard[position.row][position.col].units.push(card);
        return { board: newBoard };
      });
    },

    placeUnitOnVertex: (card, vertexKey) => {
      set((state) => {
        const newVertices = { ...state.vertices };
        if (!newVertices[vertexKey]) {
          newVertices[vertexKey] = [];
        }
        newVertices[vertexKey] = [...newVertices[vertexKey], card];
        return { vertices: newVertices };
      });
    },

    removeCardFromVertex: (cardId, vertexKey) => {
      set((state) => {
        const newVertices = { ...state.vertices };
        if (newVertices[vertexKey]) {
          newVertices[vertexKey] = newVertices[vertexKey].filter((c) => c.id !== cardId);
          if (newVertices[vertexKey].length === 0) {
            delete newVertices[vertexKey];
          }
        }
        return { vertices: newVertices };
      });
    },

    moveCard: (cardId, from, to) => {
      set((state) => {
        const newBoard = [...state.board.map((row) => [...row.map((site) => ({ ...site, units: [...site.units] }))])];
        const fromSite = newBoard[from.row][from.col];
        const toSite = newBoard[to.row][to.col];

        if (fromSite.siteCard?.id === cardId) {
          toSite.siteCard = fromSite.siteCard;
          fromSite.siteCard = null;
        } else {
          const unitIndex = fromSite.units.findIndex((u) => u.id === cardId);
          if (unitIndex !== -1) {
            const [unit] = fromSite.units.splice(unitIndex, 1);
            toSite.units.push(unit);
          }
        }

        return { board: newBoard };
      });
    },

    removeCardFromBoard: (cardId, position) => {
      set((state) => {
        const newBoard = [...state.board.map((row) => [...row.map((site) => ({ ...site, units: [...site.units], underCards: [...site.underCards] }))])];
        const site = newBoard[position.row][position.col];

        if (site.siteCard?.id === cardId) {
          site.siteCard = null;
        } else {
          const unitIndex = site.units.findIndex((u) => u.id === cardId);
          if (unitIndex !== -1) {
            site.units.splice(unitIndex, 1);
          } else {
            const underIndex = site.underCards.findIndex((u) => u.id === cardId);
            if (underIndex !== -1) {
              site.underCards.splice(underIndex, 1);
            }
          }
        }

        return { board: newBoard };
      });
    },

    placeAvatar: (card, position) => {
      set((state) => {
        const newBoard = [...state.board.map((row) => [...row.map((site) => ({ ...site, units: [...site.units] }))])];
        newBoard[position.row][position.col].units.push(card);
        return { board: newBoard };
      });
    },

    raiseUnit: (cardId, position) => {
      set((state) => {
        const newBoard = [...state.board.map((row) => [...row.map((site) => ({ ...site, units: [...site.units] }))])];
        const site = newBoard[position.row][position.col];
        const unitIndex = site.units.findIndex((u) => u.id === cardId);

        if (unitIndex === -1 || unitIndex === site.units.length - 1) {
          return state;
        }

        const [unit] = site.units.splice(unitIndex, 1);
        site.units.push(unit);

        return { board: newBoard };
      });
    },
  };
}
