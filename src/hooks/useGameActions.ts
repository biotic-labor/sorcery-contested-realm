import { useCallback } from 'react';
import { useGameStore } from './useGameState';
import { useMultiplayerStore } from './useMultiplayer';
import { BoardPosition, CardInstance, Player, DeckType } from '../types';

/**
 * Hook that wraps game store actions to broadcast them over P2P in multiplayer mode.
 * Use this instead of directly calling useGameStore actions when you want actions
 * to be synchronized across players.
 */
export function useGameActions() {
  const gameStore = useGameStore();
  const { connectionStatus, broadcastAction, localPlayer, sendEndTurn, addLogEntry, nickname } = useMultiplayerStore();

  const isMultiplayer = connectionStatus === 'connected';

  // Helper to broadcast action if in multiplayer
  const broadcast = useCallback((actionName: string, payload: Record<string, unknown>) => {
    if (isMultiplayer) {
      broadcastAction(actionName, payload);
    }
  }, [isMultiplayer, broadcastAction]);

  // Card placement
  const placeCardOnSite = useCallback((card: CardInstance, position: BoardPosition) => {
    gameStore.placeCardOnSite(card, position);
    broadcast('placeCardOnSite', {
      card: serializeCard(card),
      position,
    });
    if (isMultiplayer) {
      addLogEntry({
        type: 'action',
        player: localPlayer,
        nickname,
        message: `played ${card.cardData.name} at grid ${position.row * 5 + position.col + 1}`,
      });
    }
  }, [gameStore, broadcast, isMultiplayer, addLogEntry, localPlayer, nickname]);

  const placeUnitOnSite = useCallback((card: CardInstance, position: BoardPosition) => {
    gameStore.placeUnitOnSite(card, position);
    broadcast('placeUnitOnSite', {
      card: serializeCard(card),
      position,
    });
    if (isMultiplayer) {
      addLogEntry({
        type: 'action',
        player: localPlayer,
        nickname,
        message: `played ${card.cardData.name} at grid ${position.row * 5 + position.col + 1}`,
      });
    }
  }, [gameStore, broadcast, isMultiplayer, addLogEntry, localPlayer, nickname]);

  const placeUnitOnVertex = useCallback((card: CardInstance, vertexKey: string) => {
    gameStore.placeUnitOnVertex(card, vertexKey);
    broadcast('placeUnitOnVertex', {
      card: serializeCard(card),
      vertexKey,
    });
    if (isMultiplayer) {
      addLogEntry({
        type: 'action',
        player: localPlayer,
        nickname,
        message: `placed ${card.cardData.name} at vertex ${vertexKey}`,
      });
    }
  }, [gameStore, broadcast, isMultiplayer, addLogEntry, localPlayer, nickname]);

  const moveCard = useCallback((cardId: string, from: BoardPosition, to: BoardPosition) => {
    gameStore.moveCard(cardId, from, to);
    broadcast('moveCard', { cardId, from, to });
    if (isMultiplayer) {
      addLogEntry({
        type: 'action',
        player: localPlayer,
        nickname,
        message: `moved a card from grid ${from.row * 5 + from.col + 1} to ${to.row * 5 + to.col + 1}`,
      });
    }
  }, [gameStore, broadcast, isMultiplayer, addLogEntry, localPlayer, nickname]);

  const moveAvatar = useCallback((cardId: string, from: BoardPosition, to: BoardPosition) => {
    gameStore.moveAvatar(cardId, from, to);
    broadcast('moveAvatar', { cardId, from, to });
  }, [gameStore, broadcast]);

  const rotateCard = useCallback((cardId: string) => {
    gameStore.rotateCard(cardId);
    broadcast('rotateCard', { cardId });
  }, [gameStore, broadcast]);

  const toggleCardUnder = useCallback((cardId: string) => {
    gameStore.toggleCardUnder(cardId);
    broadcast('toggleCardUnder', { cardId });
  }, [gameStore, broadcast]);

  const adjustCardCounter = useCallback((cardId: string, amount: number) => {
    gameStore.adjustCardCounter(cardId, amount);
    broadcast('adjustCardCounter', { cardId, amount });
  }, [gameStore, broadcast]);

  // Hand management
  const addToHand = useCallback((card: CardInstance, player: Player) => {
    gameStore.addToHand(card, player);
    broadcast('addToHand', { card: serializeCard(card), player });
  }, [gameStore, broadcast]);

  const removeFromHand = useCallback((cardId: string, player: Player) => {
    // Get the card's sourceDeck before removing (for hidden card matching on remote)
    const hand = player === 'player' ? gameStore.playerHand : gameStore.opponentHand;
    const card = hand.find(c => c.id === cardId);
    const sourceDeck = card?.sourceDeck;

    gameStore.removeFromHand(cardId, player);
    broadcast('removeFromHand', { cardId, player, sourceDeck });
  }, [gameStore, broadcast]);

  const reorderHand = useCallback((player: Player, fromIndex: number, toIndex: number) => {
    gameStore.reorderHand(player, fromIndex, toIndex);
    broadcast('reorderHand', { player, fromIndex, toIndex });
  }, [gameStore, broadcast]);

  // Board removal
  const removeCardFromBoard = useCallback((cardId: string, position: BoardPosition) => {
    gameStore.removeCardFromBoard(cardId, position);
    broadcast('removeCardFromBoard', { cardId, position });
  }, [gameStore, broadcast]);

  const removeCardFromVertex = useCallback((cardId: string, vertexKey: string) => {
    gameStore.removeCardFromVertex(cardId, vertexKey);
    broadcast('removeCardFromVertex', { cardId, vertexKey });
  }, [gameStore, broadcast]);

  // Life management
  const adjustLife = useCallback((player: Player, amount: number) => {
    gameStore.adjustLife(player, amount);
    broadcast('adjustLife', { player, amount });
    if (isMultiplayer) {
      const action = amount > 0 ? 'gained' : 'lost';
      addLogEntry({
        type: 'action',
        player: localPlayer,
        nickname,
        message: `${action} ${Math.abs(amount)} life`,
      });
    }
  }, [gameStore, broadcast, isMultiplayer, addLogEntry, localPlayer, nickname]);

  // Mana management
  const adjustMana = useCallback((player: Player, amount: number) => {
    gameStore.adjustMana(player, amount);
    broadcast('adjustMana', { player, amount });
    if (isMultiplayer) {
      addLogEntry({
        type: 'action',
        player: localPlayer,
        nickname,
        message: `mana ${amount >= 0 ? '+' : ''}${amount}`,
      });
    }
  }, [gameStore, broadcast, isMultiplayer, addLogEntry, localPlayer, nickname]);

  const adjustManaTotal = useCallback((player: Player, amount: number) => {
    gameStore.adjustManaTotal(player, amount);
    broadcast('adjustManaTotal', { player, amount });
    if (isMultiplayer) {
      addLogEntry({
        type: 'action',
        player: localPlayer,
        nickname,
        message: `max mana ${amount >= 0 ? '+' : ''}${amount}`,
      });
    }
  }, [gameStore, broadcast, isMultiplayer, addLogEntry, localPlayer, nickname]);

  // Deck operations
  const shuffleDeck = useCallback((player: Player, deckType: DeckType) => {
    gameStore.shuffleDeck(player, deckType);
    broadcast('shuffleDeck', { player, deckType });
    if (isMultiplayer) {
      addLogEntry({
        type: 'action',
        player: localPlayer,
        nickname,
        message: `shuffled their ${deckType} deck`,
      });
    }
  }, [gameStore, broadcast, isMultiplayer, addLogEntry, localPlayer, nickname]);

  const drawCards = useCallback((player: Player, deckType: DeckType, count: number) => {
    gameStore.drawCards(player, deckType, count);
    broadcast('drawCards', { player, deckType, count });
    if (isMultiplayer) {
      addLogEntry({
        type: 'action',
        player: localPlayer,
        nickname,
        message: `drew ${count} card${count !== 1 ? 's' : ''} from ${deckType} deck`,
      });
    }
  }, [gameStore, broadcast, isMultiplayer, addLogEntry, localPlayer, nickname]);

  const putCardOnTop = useCallback((card: CardInstance, player: Player, deckType: DeckType) => {
    gameStore.putCardOnTop(card, player, deckType);
    broadcast('putCardOnTop', { card: serializeCard(card), player, deckType });
  }, [gameStore, broadcast]);

  const putCardOnBottom = useCallback((card: CardInstance, player: Player, deckType: DeckType) => {
    gameStore.putCardOnBottom(card, player, deckType);
    broadcast('putCardOnBottom', { card: serializeCard(card), player, deckType });
  }, [gameStore, broadcast]);

  // Deck search - peekDeck is local only (opponent shouldn't see cards)
  // returnCardsToDeck broadcasts so opponent's deck state stays in sync
  const returnCardsToDeck = useCallback((cards: CardInstance[], player: Player, deckType: DeckType, position: 'top' | 'bottom') => {
    gameStore.returnCardsToDeck(cards, player, deckType, position);
    broadcast('returnCardsToDeck', {
      cards: cards.map(c => serializeCard(c)),
      player,
      deckType,
      position,
    });
  }, [gameStore, broadcast]);

  // Graveyard
  const addToGraveyard = useCallback((card: CardInstance, player: Player) => {
    gameStore.addToGraveyard(card, player);
    broadcast('addToGraveyard', { card: serializeCard(card), player });
    if (isMultiplayer) {
      addLogEntry({
        type: 'action',
        player: localPlayer,
        nickname,
        message: `discarded ${card.cardData.name}`,
      });
    }
  }, [gameStore, broadcast, isMultiplayer, addLogEntry, localPlayer, nickname]);

  const removeFromGraveyard = useCallback((cardId: string, player: Player) => {
    const card = gameStore.removeFromGraveyard(cardId, player);
    broadcast('removeFromGraveyard', { cardId, player });
    return card;
  }, [gameStore, broadcast]);

  // Spell stack (casting zone)
  const addToSpellStack = useCallback((card: CardInstance, player: Player) => {
    gameStore.addToSpellStack(card, player);
    broadcast('addToSpellStack', { card: serializeCard(card), player });
    if (isMultiplayer) {
      addLogEntry({
        type: 'action',
        player: localPlayer,
        nickname,
        message: `cast ${card.cardData.name}`,
      });
    }
  }, [gameStore, broadcast, isMultiplayer, addLogEntry, localPlayer, nickname]);

  const removeFromSpellStack = useCallback((cardId: string, player: Player) => {
    const card = gameStore.removeFromSpellStack(cardId, player);
    broadcast('removeFromSpellStack', { cardId, player });
    return card;
  }, [gameStore, broadcast]);

  const clearSpellStack = useCallback((player: Player) => {
    gameStore.clearSpellStack(player);
    broadcast('clearSpellStack', { player });
  }, [gameStore, broadcast]);

  // Avatar placement
  const placeAvatar = useCallback((card: CardInstance, position: BoardPosition) => {
    gameStore.placeAvatar(card, position);
    broadcast('placeAvatar', { card: serializeCard(card), position });
  }, [gameStore, broadcast]);

  // Turn management
  const endTurn = useCallback(() => {
    if (isMultiplayer) {
      sendEndTurn();
    } else {
      gameStore.endTurn();
    }
  }, [gameStore, isMultiplayer, sendEndTurn]);

  // Deck import - broadcasts avatar (public) and deck counts (hidden cards for opponent)
  const importDeck = useCallback((
    siteCards: CardInstance[],
    spellCards: CardInstance[],
    avatar: CardInstance | null,
    player: Player
  ) => {
    gameStore.importDeck(siteCards, spellCards, avatar, player);
    // Broadcast avatar (public) with its position, and deck counts (opponent creates hidden cards)
    const avatarPosition = player === 'player' ? { row: 3, col: 2 } : { row: 0, col: 2 };
    broadcast('deckImported', {
      player,
      siteDeckCount: siteCards.length,
      spellDeckCount: spellCards.length,
      avatar: avatar ? serializeCard(avatar) : null,
      avatarPosition: avatar ? avatarPosition : null,
    });
    if (isMultiplayer) {
      addLogEntry({
        type: 'system',
        player: localPlayer,
        nickname,
        message: 'imported their deck',
      });
    }
  }, [gameStore, broadcast, isMultiplayer, addLogEntry, localPlayer, nickname]);

  // Start turn - broadcasts in multiplayer
  const startTurn = useCallback((player: Player) => {
    gameStore.startTurn(player);
    broadcast('startTurn', { player });
    if (isMultiplayer) {
      addLogEntry({
        type: 'action',
        player: localPlayer,
        nickname,
        message: 'started their turn',
      });
    }
  }, [gameStore, broadcast, isMultiplayer, addLogEntry, localPlayer, nickname]);

  // Non-broadcasted actions (UI only, read from store directly)
  const selectCard = gameStore.selectCard;
  const hoverCard = gameStore.hoverCard;
  const setHoveredDeck = gameStore.setHoveredDeck;
  const clearDecks = gameStore.clearDecks;
  const resetGame = gameStore.resetGame;
  const untapAllCards = gameStore.untapAllCards;

  return {
    // Broadcasted actions
    placeCardOnSite,
    placeUnitOnSite,
    placeUnitOnVertex,
    moveCard,
    moveAvatar,
    rotateCard,
    toggleCardUnder,
    adjustCardCounter,
    addToHand,
    removeFromHand,
    reorderHand,
    removeCardFromBoard,
    removeCardFromVertex,
    adjustLife,
    adjustMana,
    adjustManaTotal,
    shuffleDeck,
    drawCards,
    putCardOnTop,
    putCardOnBottom,
    returnCardsToDeck,
    addToGraveyard,
    removeFromGraveyard,
    addToSpellStack,
    removeFromSpellStack,
    clearSpellStack,
    placeAvatar,
    endTurn,
    importDeck,

    // Non-broadcasted actions (deck search peek is local - opponent shouldn't see)
    peekDeck: gameStore.peekDeck,
    selectCard,
    hoverCard,
    setHoveredDeck,
    clearDecks,
    resetGame,
    startTurn,
    untapAllCards,
  };
}

// Helper to serialize card for transmission (could strip unneeded data later)
function serializeCard(card: CardInstance): CardInstance {
  return card;
}
