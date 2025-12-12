import { GameState, CardInstance, Player } from '../../../types';

type SetState = (fn: (state: GameState) => Partial<GameState>) => void;

export interface TokenActions {
  attachToken: (tokenId: string, targetCardId: string) => void;
  detachToken: (tokenId: string, hostCardId: string, player: Player) => void;
  removeFromAttachments: (tokenId: string, hostCardId: string) => void;
}

export function createTokenActions(set: SetState): TokenActions {
  return {
    attachToken: (tokenId, targetCardId) => {
      set((state) => {
        let token: CardInstance | null = null;

        // Check spell stacks
        let playerSpellStack = [...state.playerSpellStack];
        let opponentSpellStack = [...state.opponentSpellStack];
        const playerIdx = playerSpellStack.findIndex((c) => c.id === tokenId);
        if (playerIdx !== -1) {
          [token] = playerSpellStack.splice(playerIdx, 1);
        } else {
          const opponentIdx = opponentSpellStack.findIndex((c) => c.id === tokenId);
          if (opponentIdx !== -1) {
            [token] = opponentSpellStack.splice(opponentIdx, 1);
          }
        }

        // Check hands
        let playerHand = [...state.playerHand];
        let opponentHand = [...state.opponentHand];
        if (!token) {
          const playerHandIdx = playerHand.findIndex((c) => c.id === tokenId);
          if (playerHandIdx !== -1) {
            [token] = playerHand.splice(playerHandIdx, 1);
          } else {
            const opponentHandIdx = opponentHand.findIndex((c) => c.id === tokenId);
            if (opponentHandIdx !== -1) {
              [token] = opponentHand.splice(opponentHandIdx, 1);
            }
          }
        }

        // Helper to remove token from attachments
        const removeFromAttachmentsIfPresent = (card: CardInstance): CardInstance => {
          if (card.attachments) {
            const idx = card.attachments.findIndex((a) => a.id === tokenId);
            if (idx !== -1) {
              const newAttachments = [...card.attachments];
              [token] = newAttachments.splice(idx, 1);
              return { ...card, attachments: newAttachments.length > 0 ? newAttachments : undefined };
            }
          }
          return card;
        };

        // Check board units
        let newBoard = state.board;
        if (!token) {
          newBoard = state.board.map((row) =>
            row.map((site) => {
              const newSite = { ...site, units: [...site.units] };
              const unitIdx = newSite.units.findIndex((u) => u.id === tokenId);
              if (unitIdx !== -1) {
                [token] = newSite.units.splice(unitIdx, 1);
              }
              return newSite;
            })
          );
        }

        // Check existing attachments
        if (!token) {
          newBoard = newBoard.map((row) =>
            row.map((site) => ({
              ...site,
              siteCard: site.siteCard ? removeFromAttachmentsIfPresent(site.siteCard) : null,
              units: site.units.map(removeFromAttachmentsIfPresent),
              underCards: site.underCards.map(removeFromAttachmentsIfPresent),
            }))
          );
        }

        // Check vertices attachments
        let newVertices = { ...state.vertices };
        if (!token) {
          for (const key of Object.keys(newVertices)) {
            newVertices[key] = newVertices[key].map(removeFromAttachmentsIfPresent);
          }
        }

        if (!token) return state;

        // Add attachment to target
        const addAttachment = (card: CardInstance): CardInstance => {
          if (card.id === targetCardId) {
            return { ...card, attachments: [...(card.attachments || []), token!] };
          }
          return card;
        };

        const finalBoard = newBoard.map((row) =>
          row.map((site) => ({
            ...site,
            siteCard: site.siteCard ? addAttachment(site.siteCard) : null,
            units: site.units.map(addAttachment),
            underCards: site.underCards.map(addAttachment),
          }))
        );

        const finalVertices = { ...newVertices };
        for (const key of Object.keys(finalVertices)) {
          finalVertices[key] = finalVertices[key].map(addAttachment);
        }

        return {
          board: finalBoard,
          vertices: finalVertices,
          playerSpellStack,
          opponentSpellStack,
          playerHand,
          opponentHand,
        };
      });
    },

    detachToken: (tokenId, hostCardId, player) => {
      set((state) => {
        let token: CardInstance | null = null;

        const removeAttachment = (card: CardInstance): CardInstance => {
          if (card.id === hostCardId && card.attachments) {
            const idx = card.attachments.findIndex((a) => a.id === tokenId);
            if (idx !== -1) {
              const newAttachments = [...card.attachments];
              [token] = newAttachments.splice(idx, 1);
              return { ...card, attachments: newAttachments.length > 0 ? newAttachments : undefined };
            }
          }
          return card;
        };

        const newBoard = state.board.map((row) =>
          row.map((site) => ({
            ...site,
            siteCard: site.siteCard ? removeAttachment(site.siteCard) : null,
            units: site.units.map(removeAttachment),
            underCards: site.underCards.map(removeAttachment),
          }))
        );

        const newVertices = { ...state.vertices };
        for (const key of Object.keys(newVertices)) {
          newVertices[key] = newVertices[key].map(removeAttachment);
        }

        if (!token) return state;

        return {
          board: newBoard,
          vertices: newVertices,
          playerSpellStack: player === 'player' ? [...state.playerSpellStack, token] : state.playerSpellStack,
          opponentSpellStack: player === 'opponent' ? [...state.opponentSpellStack, token] : state.opponentSpellStack,
        };
      });
    },

    removeFromAttachments: (tokenId, hostCardId) => {
      set((state) => {
        const removeAttachment = (card: CardInstance): CardInstance => {
          if (card.id === hostCardId && card.attachments) {
            const idx = card.attachments.findIndex((a) => a.id === tokenId);
            if (idx !== -1) {
              const newAttachments = [...card.attachments];
              newAttachments.splice(idx, 1);
              return { ...card, attachments: newAttachments.length > 0 ? newAttachments : undefined };
            }
          }
          return card;
        };

        const newBoard = state.board.map((row) =>
          row.map((site) => ({
            ...site,
            siteCard: site.siteCard ? removeAttachment(site.siteCard) : null,
            units: site.units.map(removeAttachment),
            underCards: site.underCards.map(removeAttachment),
          }))
        );

        const newVertices = { ...state.vertices };
        for (const key of Object.keys(newVertices)) {
          newVertices[key] = newVertices[key].map(removeAttachment);
        }

        return {
          board: newBoard,
          vertices: newVertices,
        };
      });
    },
  };
}
