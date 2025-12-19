import { useGameStore } from '../useGameState';
import { GameAction, LogEntry } from '../../types/multiplayer';
import { Player, CardInstance } from '../../types';
import { swapPlayer, createHiddenCards } from './multiplayerUtils';

type AddLogEntry = (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;

/**
 * Apply a remote action from opponent.
 * This is the core function that processes all game actions received over P2P.
 *
 * CRITICAL: Most actions should NOT swap player references. Data must go into
 * the SAME slot on both clients (host's deck -> playerSiteDeck, guest's deck -> opponentSiteDeck).
 * UI perspective mapping handles displaying the right data in the right position.
 */
export function applyRemoteAction(
  action: GameAction,
  localPlayer: Player,
  addLogEntry: AddLogEntry,
  opponentNickname: string
): void {
  const gameStore = useGameStore.getState();
  const payload = action.payload;

  // Helper to get opponent's player value for log entries
  const opponentPlayer = localPlayer === 'player' ? 'opponent' : 'player';

  // When we receive an action, the opponent's "player" is our "opponent"
  // So we need to swap player references
  const needsSwap = localPlayer === 'opponent';

  switch (action.name) {
    case 'placeCardOnSite': {
      // DO NOT swap owner - card ownership is canonical for rotation logic
      const card = payload.card as CardInstance;
      const position = payload.position as { row: number; col: number };
      gameStore.placeCardOnSite(card, position);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `placed ${card.cardData?.name || 'a card'} on grid ${position.row * 5 + position.col + 1}`,
      });
      break;
    }
    case 'placeUnitOnSite': {
      // DO NOT swap owner - card ownership is canonical for rotation logic
      const card = payload.card as CardInstance;
      const position = payload.position as { row: number; col: number };
      gameStore.placeUnitOnSite(card, position);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `placed ${card.cardData?.name || 'a card'} on grid ${position.row * 5 + position.col + 1}`,
      });
      break;
    }
    case 'placeUnitOnVertex': {
      // DO NOT swap owner - card ownership is canonical for rotation logic
      const card = payload.card as CardInstance;
      const vertexKey = payload.vertexKey as string;
      gameStore.placeUnitOnVertex(card, vertexKey);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `placed ${card.cardData?.name || 'a card'} at vertex ${vertexKey}`,
      });
      break;
    }
    case 'moveCard': {
      const { cardId, from, to } = payload as { cardId: string; from: { row: number; col: number }; to: { row: number; col: number } };
      gameStore.moveCard(cardId, from, to);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `moved a card from grid ${from.row * 5 + from.col + 1} to ${to.row * 5 + to.col + 1}`,
      });
      break;
    }
    case 'moveAvatar': {
      // Legacy support: avatars are now stored in site.units, use moveCard
      const { cardId, from, to } = payload as { cardId: string; from: { row: number; col: number }; to: { row: number; col: number } };
      gameStore.moveCard(cardId, from, to);
      break;
    }
    case 'raiseUnit': {
      const cardId = payload.cardId as string;
      const position = payload.position as { row: number; col: number };
      gameStore.raiseUnit(cardId, position);
      break;
    }
    case 'raiseAvatar': {
      // Legacy support: avatars are now stored in site.units, use raiseUnit
      const cardId = payload.cardId as string;
      const position = payload.position as { row: number; col: number };
      gameStore.raiseUnit(cardId, position);
      break;
    }
    case 'rotateCard': {
      gameStore.rotateCard(payload.cardId as string);
      break;
    }
    case 'toggleCardUnder': {
      gameStore.toggleCardUnder(payload.cardId as string);
      break;
    }
    case 'adjustCardCounter': {
      gameStore.adjustCardCounter(payload.cardId as string, payload.amount as number);
      break;
    }
    case 'flipCard': {
      gameStore.flipCard(payload.cardId as string);
      break;
    }
    case 'addToHand': {
      // DO NOT swap - data should go in same slot on both clients
      const card = payload.card as CardInstance;
      const player = payload.player as Player;
      gameStore.addToHand(card, player);
      break;
    }
    case 'removeFromHand': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      const cardId = payload.cardId as string;
      const sourceDeck = payload.sourceDeck as 'site' | 'spell' | undefined;
      const hand = player === 'player' ? gameStore.playerHand : gameStore.opponentHand;

      // Try to find card by ID first
      const hasCard = hand.some(c => c.id === cardId);
      if (hasCard) {
        gameStore.removeFromHand(cardId, player);
      } else if (hand.length > 0) {
        // Card ID not found (hidden cards have different IDs)
        // Find a hidden card matching the source deck type
        const hiddenCard = sourceDeck
          ? hand.find(c => c.id.startsWith('hidden-') && c.sourceDeck === sourceDeck)
          : hand.find(c => c.id.startsWith('hidden-'));
        if (hiddenCard) {
          gameStore.removeFromHand(hiddenCard.id, player);
        }
      }
      break;
    }
    case 'reorderHand': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      gameStore.reorderHand(player, payload.fromIndex as number, payload.toIndex as number);
      break;
    }
    case 'removeCardFromBoard': {
      gameStore.removeCardFromBoard(payload.cardId as string, payload.position as { row: number; col: number });
      break;
    }
    case 'removeCardFromVertex': {
      gameStore.removeCardFromVertex(payload.cardId as string, payload.vertexKey as string);
      break;
    }
    case 'adjustLife': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      const amount = payload.amount as number;
      gameStore.adjustLife(player, amount);
      const currentLife = useGameStore.getState()[player === 'player' ? 'playerLife' : 'opponentLife'];
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `life ${amount >= 0 ? '+' : ''}${amount} (now ${currentLife})`,
      });
      break;
    }
    case 'adjustMana': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      const amount = payload.amount as number;
      gameStore.adjustMana(player, amount);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `mana ${amount >= 0 ? '+' : ''}${amount}`,
      });
      break;
    }
    case 'adjustManaTotal': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      const amount = payload.amount as number;
      gameStore.adjustManaTotal(player, amount);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `max mana ${amount >= 0 ? '+' : ''}${amount}`,
      });
      break;
    }
    case 'adjustThreshold': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      const element = payload.element as 'air' | 'earth' | 'fire' | 'water';
      const amount = payload.amount as number;
      gameStore.adjustThreshold(player, element, amount);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `${element} threshold ${amount >= 0 ? '+' : ''}${amount}`,
      });
      break;
    }
    case 'shuffleDeck': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      const deckType = payload.deckType as 'site' | 'spell';
      gameStore.shuffleDeck(player, deckType);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `shuffled their ${deckType} deck`,
      });
      break;
    }
    case 'drawCards': {
      // DO NOT swap - data should go in same slot on both clients
      // UI perspective mapping handles showing correct hand in correct position
      const player = payload.player as Player;
      const deckType = payload.deckType as 'site' | 'spell';
      const count = payload.count as number;
      gameStore.drawCards(player, deckType, count);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `drew ${count} card${count !== 1 ? 's' : ''} from ${deckType} deck`,
      });
      break;
    }
    case 'putCardOnTop': {
      // DO NOT swap - data should go in same slot on both clients
      const card = payload.card as CardInstance;
      const player = payload.player as Player;
      gameStore.putCardOnTop(card, player, payload.deckType as 'site' | 'spell');
      break;
    }
    case 'putCardOnBottom': {
      // DO NOT swap - data should go in same slot on both clients
      const card = payload.card as CardInstance;
      const player = payload.player as Player;
      gameStore.putCardOnBottom(card, player, payload.deckType as 'site' | 'spell');
      break;
    }
    case 'returnCardsToDeck': {
      // DO NOT swap - data should go in same slot on both clients
      const cards = payload.cards as CardInstance[];
      const player = payload.player as Player;
      const deckType = payload.deckType as 'site' | 'spell';
      const position = payload.position as 'top' | 'bottom';
      gameStore.returnCardsToDeck(cards, player, deckType, position);
      break;
    }
    case 'removeTopCardFromDeck': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      const deckType = payload.deckType as 'site' | 'spell';
      gameStore.removeTopCardFromDeck(player, deckType);
      break;
    }
    case 'removeCardFromDeckById': {
      // DO NOT swap - data should go in same slot on both clients
      const cardId = payload.cardId as string;
      const player = payload.player as Player;
      const deckType = payload.deckType as 'site' | 'spell';
      gameStore.removeCardFromDeckById(cardId, player, deckType);
      break;
    }
    case 'addToGraveyard': {
      // DO NOT swap - data should go in same slot on both clients
      const card = payload.card as CardInstance;
      const player = payload.player as Player;
      gameStore.addToGraveyard(card, player);
      break;
    }
    case 'removeFromGraveyard': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      gameStore.removeFromGraveyard(payload.cardId as string, player);
      break;
    }
    case 'addToCollection': {
      // DO NOT swap - data should go in same slot on both clients
      const card = payload.card as CardInstance;
      const player = payload.player as Player;
      gameStore.addToCollection(card, player);
      break;
    }
    case 'removeFromCollection': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      gameStore.removeFromCollection(payload.cardId as string, player);
      break;
    }
    case 'addToSpellStack': {
      // DO NOT swap - data should go in same slot on both clients
      const card = payload.card as CardInstance;
      const player = payload.player as Player;
      gameStore.addToSpellStack(card, player);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `cast ${card.cardData?.name || 'a spell'}`,
      });
      break;
    }
    case 'removeFromSpellStack': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      gameStore.removeFromSpellStack(payload.cardId as string, player);
      break;
    }
    case 'clearSpellStack': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      gameStore.clearSpellStack(player);
      break;
    }
    case 'copyCard': {
      // DO NOT swap - data should go in same slot on both clients
      // The copy has already been created with new ID, just add to spell stack
      const card = payload.card as CardInstance;
      const player = payload.player as Player;
      gameStore.addToSpellStack(card, player);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: `copied ${card.cardData?.name || 'a card'}`,
      });
      break;
    }
    case 'attachToken': {
      const tokenId = payload.tokenId as string;
      const targetCardId = payload.targetCardId as string;
      gameStore.attachToken(tokenId, targetCardId);
      break;
    }
    case 'detachToken': {
      // DO NOT swap - data should go in same slot on both clients
      const tokenId = payload.tokenId as string;
      const hostCardId = payload.hostCardId as string;
      const player = payload.player as Player;
      gameStore.detachToken(tokenId, hostCardId, player);
      break;
    }
    case 'removeFromAttachments': {
      const tokenId = payload.tokenId as string;
      const hostCardId = payload.hostCardId as string;
      gameStore.removeFromAttachments(tokenId, hostCardId);
      break;
    }
    case 'placeAvatar': {
      const card = payload.card as CardInstance;
      const adjustedCard = needsSwap ? { ...card, owner: swapPlayer(card.owner) } : card;
      gameStore.placeAvatar(adjustedCard, payload.position as { row: number; col: number });
      break;
    }
    case 'deckImported': {
      const siteDeckCount = payload.siteDeckCount as number;
      const spellDeckCount = payload.spellDeckCount as number;
      const avatar = payload.avatar as CardInstance | null;
      const avatarPosition = payload.avatarPosition as { row: number; col: number } | null;
      const sourcePlayer = payload.player as Player;
      const isMagician = payload.isMagician as boolean | undefined;

      // DO NOT swap player - data should go in same slot on both clients
      // Host's deck -> playerSiteDeck, Guest's deck -> opponentSiteDeck
      // UI perspective mapping handles showing correct deck in correct position
      const targetPlayer = sourcePlayer;

      // Place avatar at the SAME canonical position the sender used
      if (avatar && avatarPosition) {
        // Avatar owner matches the player who imported (no swap needed)
        gameStore.placeAvatar(avatar, avatarPosition);
      }

      // Create hidden placeholder cards for opponent's decks (with deck type for card back display)
      const hiddenSiteCards = createHiddenCards(siteDeckCount, targetPlayer, 'site');
      const hiddenSpellCards = createHiddenCards(spellDeckCount, targetPlayer, 'spell');
      gameStore.setDecks(targetPlayer, hiddenSiteCards, hiddenSpellCards);

      // Store Magician flag for the opponent
      if (isMagician !== undefined) {
        gameStore.setIsMagician(targetPlayer, isMagician);
      }

      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: 'imported their deck',
      });
      break;
    }
    case 'startTurn': {
      // DO NOT swap - data should go in same slot on both clients
      const player = payload.player as Player;
      gameStore.startTurn(player);
      addLogEntry({
        type: 'action',
        player: opponentPlayer,
        nickname: opponentNickname,
        message: 'started their turn',
      });
      break;
    }
    default:
      console.warn('Unknown remote action:', action.name);
  }
}
