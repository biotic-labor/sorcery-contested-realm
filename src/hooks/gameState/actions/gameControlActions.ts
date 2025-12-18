import { GameState, CardInstance, Player, DeckType } from '../../../types';
import { SerializedGameState } from '../../../types/multiplayer';
import { initialState } from '../initialState';

type SetState = (fn: (state: GameState) => Partial<GameState>) => void;
type GetState = () => GameState;

export interface GameControlActions {
  startTurn: (player: Player) => void;
  endTurn: () => void;
  setCurrentTurn: (player: Player) => void;
  hoverCard: (card: CardInstance | null) => void;
  setHoveredDeck: (deck: { player: Player; deckType: DeckType } | null) => void;
  resetGame: () => void;
  importDeck: (
    siteCards: CardInstance[],
    spellCards: CardInstance[],
    avatar: CardInstance | null,
    player: Player,
    collectionCards?: CardInstance[]
  ) => void;
  clearDecks: (player: Player) => void;
  setDecks: (player: Player, siteCards: CardInstance[], spellCards: CardInstance[]) => void;
  applyFullState: (state: SerializedGameState) => void;
  setHarbingerMarkers: (positions: string[]) => void;
  clearHarbingerMarkers: () => void;
}

export function createGameControlActions(
  set: SetState,
  _get: GetState,
  shuffleDeck: (player: Player, deckType: DeckType) => void
): GameControlActions {
  return {
    startTurn: (player) => {
      set((state) => {
        const untapWithAttachments = (card: CardInstance): CardInstance => ({
          ...card,
          rotation: 0,
          attachments: card.attachments?.map((att) => ({ ...att, rotation: 0 })),
        });

        const newBoard = state.board.map((row) =>
          row.map((site) => ({
            ...site,
            siteCard: site.siteCard?.owner === player
              ? untapWithAttachments(site.siteCard)
              : site.siteCard,
            units: site.units.map((u) =>
              u.owner === player ? untapWithAttachments(u) : u
            ),
            underCards: site.underCards.map((u) =>
              u.owner === player ? untapWithAttachments(u) : u
            ),
          }))
        );

        const newVertices = { ...state.vertices };
        for (const key of Object.keys(newVertices)) {
          newVertices[key] = newVertices[key].map((u) =>
            u.owner === player ? untapWithAttachments(u) : u
          );
        }

        return {
          board: newBoard,
          vertices: newVertices,
          playerMana: player === 'player' ? state.playerManaTotal : state.playerMana,
          opponentMana: player === 'opponent' ? state.opponentManaTotal : state.opponentMana,
          turnStarted: true,
        };
      });
    },

    endTurn: () => {
      set((state) => {
        const nextPlayer: Player = state.currentTurn === 'player' ? 'opponent' : 'player';
        return {
          currentTurn: nextPlayer,
          turnNumber: state.currentTurn === 'opponent' ? state.turnNumber + 1 : state.turnNumber,
          turnStarted: false,
        };
      });
    },

    setCurrentTurn: (player) => {
      set(() => ({ currentTurn: player }));
    },

    hoverCard: (card) => set(() => ({ hoveredCard: card })),

    setHoveredDeck: (deck) => set(() => ({ hoveredDeck: deck })),

    resetGame: () => set(() => initialState),

    importDeck: (siteCards, spellCards, avatar, player, collectionCards) => {
      set((state) => {
        const siteDeckKey = player === 'player' ? 'playerSiteDeck' : 'opponentSiteDeck';
        const spellDeckKey = player === 'player' ? 'playerSpellDeck' : 'opponentSpellDeck';
        const collectionKey = player === 'player' ? 'playerCollection' : 'opponentCollection';

        const updates: Partial<GameState> = {
          [siteDeckKey]: siteCards,
          [spellDeckKey]: spellCards,
          [collectionKey]: collectionCards || [],
        };

        if (avatar) {
          const avatarRow = player === 'player' ? 3 : 0;
          const avatarCol = 2;
          const newBoard = [...state.board.map((row) => [...row.map((site) => ({ ...site, units: [...site.units] }))])];
          newBoard[avatarRow][avatarCol].units.push(avatar);
          updates.board = newBoard;
        }

        return updates as GameState;
      });

      shuffleDeck(player, 'site');
      shuffleDeck(player, 'spell');
    },

    clearDecks: (player) => {
      set((state) => {
        const newBoard = state.board.map((row) =>
          row.map((site) => ({
            ...site,
            siteCard: site.siteCard?.owner === player ? null : site.siteCard,
            units: site.units.filter((u) => u.owner !== player),
            underCards: site.underCards.filter((u) => u.owner !== player),
          }))
        );

        const newVertices: Record<string, CardInstance[]> = {};
        for (const key of Object.keys(state.vertices)) {
          const filteredUnits = state.vertices[key].filter((u) => u.owner !== player);
          if (filteredUnits.length > 0) {
            newVertices[key] = filteredUnits;
          }
        }

        if (player === 'player') {
          return {
            board: newBoard,
            playerSiteDeck: [],
            playerSpellDeck: [],
            playerHand: [],
            playerGraveyard: [],
            playerCollection: [],
            playerSpellStack: [],
            vertices: newVertices,
            playerLife: 20,
            playerMana: 0,
            playerManaTotal: 0,
            playerThresholds: { air: 0, earth: 0, fire: 0, water: 0 },
          };
        } else {
          return {
            board: newBoard,
            opponentSiteDeck: [],
            opponentSpellDeck: [],
            opponentHand: [],
            opponentGraveyard: [],
            opponentCollection: [],
            opponentSpellStack: [],
            vertices: newVertices,
            opponentLife: 20,
            opponentMana: 0,
            opponentManaTotal: 0,
            opponentThresholds: { air: 0, earth: 0, fire: 0, water: 0 },
          };
        }
      });
    },

    setDecks: (player, siteCards, spellCards) => {
      set(() => {
        const siteDeckKey = player === 'player' ? 'playerSiteDeck' : 'opponentSiteDeck';
        const spellDeckKey = player === 'player' ? 'playerSpellDeck' : 'opponentSpellDeck';

        return {
          [siteDeckKey]: siteCards,
          [spellDeckKey]: spellCards,
        } as Partial<GameState>;
      });
    },

    applyFullState: (syncedState) => {
      set(() => ({
        board: syncedState.board,
        vertices: syncedState.vertices,
        playerHand: syncedState.playerHand,
        opponentHand: syncedState.opponentHand,
        playerSiteDeck: syncedState.playerSiteDeck,
        playerSpellDeck: syncedState.playerSpellDeck,
        opponentSiteDeck: syncedState.opponentSiteDeck,
        opponentSpellDeck: syncedState.opponentSpellDeck,
        playerGraveyard: syncedState.playerGraveyard,
        opponentGraveyard: syncedState.opponentGraveyard,
        playerSpellStack: syncedState.playerSpellStack || [],
        opponentSpellStack: syncedState.opponentSpellStack || [],
        playerLife: syncedState.playerLife,
        opponentLife: syncedState.opponentLife,
        playerMana: syncedState.playerMana,
        playerManaTotal: syncedState.playerManaTotal,
        opponentMana: syncedState.opponentMana,
        opponentManaTotal: syncedState.opponentManaTotal,
        playerThresholds: syncedState.playerThresholds,
        opponentThresholds: syncedState.opponentThresholds,
        currentTurn: syncedState.currentTurn,
        turnNumber: syncedState.turnNumber,
        hoveredCard: null,
        hoveredDeck: null,
        shufflingDeck: null,
      }));
    },

    setHarbingerMarkers: (positions) => {
      set(() => ({ harbingerMarkers: positions }));
    },

    clearHarbingerMarkers: () => {
      set(() => ({ harbingerMarkers: [] }));
    },
  };
}
