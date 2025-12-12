import { GameState, CardInstance, Player } from '../../../types';

type SetState = (fn: (state: GameState) => Partial<GameState>) => void;

export interface CardStateActions {
  rotateCard: (cardId: string) => void;
  untapAllCards: (player: Player) => void;
  adjustCardCounter: (cardId: string, amount: number) => void;
  flipCard: (cardId: string) => void;
  toggleCardUnder: (cardId: string) => void;
}

export function createCardStateActions(set: SetState): CardStateActions {
  return {
    rotateCard: (cardId) => {
      set((state) => {
        const rotateWithAttachments = (card: CardInstance): CardInstance => {
          const newRotation = card.rotation === 0 ? 90 : 0;
          return {
            ...card,
            rotation: newRotation,
            attachments: card.attachments?.map((att) => ({ ...att, rotation: newRotation })),
          };
        };

        const newBoard = state.board.map((row) =>
          row.map((site) => ({
            ...site,
            siteCard: site.siteCard?.id === cardId
              ? rotateWithAttachments(site.siteCard)
              : site.siteCard,
            units: site.units.map((u) =>
              u.id === cardId ? rotateWithAttachments(u) : u
            ),
            underCards: site.underCards.map((u) =>
              u.id === cardId ? rotateWithAttachments(u) : u
            ),
          }))
        );

        const newVertices = { ...state.vertices };
        for (const key of Object.keys(newVertices)) {
          newVertices[key] = newVertices[key].map((u) =>
            u.id === cardId ? rotateWithAttachments(u) : u
          );
        }

        return { board: newBoard, vertices: newVertices };
      });
    },

    untapAllCards: (player) => {
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

        return { board: newBoard, vertices: newVertices };
      });
    },

    adjustCardCounter: (cardId, amount) => {
      set((state) => {
        const updateCounter = (card: CardInstance): CardInstance => {
          const newCount = (card.counters || 0) + amount;
          if (newCount <= 0) {
            const { counters: _, ...rest } = card;
            return rest as CardInstance;
          }
          return { ...card, counters: newCount };
        };

        const newBoard = state.board.map((row) =>
          row.map((site) => ({
            ...site,
            siteCard: site.siteCard?.id === cardId
              ? updateCounter(site.siteCard)
              : site.siteCard,
            units: site.units.map((u) =>
              u.id === cardId ? updateCounter(u) : u
            ),
            underCards: site.underCards.map((u) =>
              u.id === cardId ? updateCounter(u) : u
            ),
          }))
        );

        const newVertices = { ...state.vertices };
        for (const key of Object.keys(newVertices)) {
          newVertices[key] = newVertices[key].map((u) =>
            u.id === cardId ? updateCounter(u) : u
          );
        }

        return { board: newBoard, vertices: newVertices };
      });
    },

    flipCard: (cardId) => {
      set((state) => {
        const toggleFaceDown = (card: CardInstance): CardInstance => {
          return { ...card, faceDown: !card.faceDown };
        };

        const newBoard = state.board.map((row) =>
          row.map((site) => ({
            ...site,
            siteCard: site.siteCard?.id === cardId
              ? toggleFaceDown(site.siteCard)
              : site.siteCard,
            units: site.units.map((u) =>
              u.id === cardId ? toggleFaceDown(u) : u
            ),
            underCards: site.underCards.map((u) =>
              u.id === cardId ? toggleFaceDown(u) : u
            ),
          }))
        );

        const newVertices = { ...state.vertices };
        for (const key of Object.keys(newVertices)) {
          newVertices[key] = newVertices[key].map((u) =>
            u.id === cardId ? toggleFaceDown(u) : u
          );
        }

        return { board: newBoard, vertices: newVertices };
      });
    },

    toggleCardUnder: (cardId) => {
      set((state) => {
        const newBoard = state.board.map((row) =>
          row.map((site) => {
            const newSite = { ...site, units: [...site.units], underCards: [...site.underCards] };

            const unitIndex = newSite.units.findIndex((u) => u.id === cardId);
            if (unitIndex !== -1) {
              const [card] = newSite.units.splice(unitIndex, 1);
              newSite.underCards.push(card);
              return newSite;
            }

            const underIndex = newSite.underCards.findIndex((u) => u.id === cardId);
            if (underIndex !== -1) {
              const [card] = newSite.underCards.splice(underIndex, 1);
              newSite.units.push(card);
              return newSite;
            }

            return newSite;
          })
        );
        return { board: newBoard };
      });
    },
  };
}
