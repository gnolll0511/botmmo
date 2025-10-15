const { createDeck, shuffleDeck, drawCard, getHandValue, getCardDisplay } = require('../utils/cardUtils');

function getBacayResult(playerCards, dealerCards) {
  const playerValue = (getHandValue(playerCards.map(c => c.slice(0, -1))) % 10);
  const dealerValue = (getHandValue(dealerCards.map(c => c.slice(0, -1))) % 10);

  // Kiểm tra bài già (J, Q, K)
  function checkRoyalCards(cards) {
    const royalCount = cards.filter(card => ['J', 'Q', 'K'].includes(card.slice(0, -1))).length;
    return royalCount === 3;
  }

  const playerHasRoyal = checkRoyalCards(playerCards);
  const dealerHasRoyal = checkRoyalCards(dealerCards);

  // Xác định kết quả và số tiền thắng/thua
  let result = {
    winner: null, // 'player', 'dealer', or 'tie'
    multiplier: 1, // Hệ số nhân tiền thưởng
    reason: ''
  };

  if (playerHasRoyal && !dealerHasRoyal) {
    result.winner = 'player';
    result.multiplier = 2;
    result.reason = 'BA GIÀ';
  } else if (dealerHasRoyal && !playerHasRoyal) {
    result.winner = 'dealer';
    result.multiplier = 1;
    result.reason = 'Nhà cái BA GIÀ';
  } else if (playerHasRoyal && dealerHasRoyal) {
    result.winner = 'tie';
    result.reason = 'Cả hai BA GIÀ';
  } else if (playerValue > dealerValue) {
    result.winner = 'player';
    result.multiplier = 1;
    result.reason = 'Điểm cao hơn';
  } else if (playerValue < dealerValue) {
    result.winner = 'dealer';
    result.multiplier = 1;
    result.reason = 'Điểm thấp hơn';
  } else {
    result.winner = 'tie';
    result.reason = 'Điểm bằng nhau';
  }

  return {
    ...result,
    playerValue,
    dealerValue,
    playerHasRoyal,
    dealerHasRoyal
  };
}

function getBlackjackResult(playerHand, dealerHand) {
  const playerValue = getHandValue(playerHand.map(c => c.slice(0, -1)));
  const dealerValue = getHandValue(dealerHand.map(c => c.slice(0, -1)));

  const playerBusted = playerValue > 21;
  const dealerBusted = dealerValue > 21;

  let result = {
    winner: null, // 'player', 'dealer', or 'tie'
    multiplier: 1.5, // Hệ số nhân tiền thưởng cho blackjack
    reason: ''
  };

  if (playerBusted) {
    result.winner = 'dealer';
    result.multiplier = 1;
    result.reason = 'Quá 21 điểm';
  } else if (dealerBusted) {
    result.winner = 'player';
    result.reason = 'Nhà cái quá 21 điểm';
  } else if (playerValue > dealerValue) {
    result.winner = 'player';
    result.reason = 'Điểm cao hơn';
  } else if (playerValue < dealerValue) {
    result.winner = 'dealer';
    result.multiplier = 1;
    result.reason = 'Điểm thấp hơn';
  } else {
    result.winner = 'tie';
    result.multiplier = 1;
    result.reason = 'Điểm bằng nhau';
  }

  return {
    ...result,
    playerValue,
    dealerValue,
    playerBusted,
    dealerBusted
  };
}

function getSlotResult(isOwner = false) {
  const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '7️⃣'];
  
  // Owner's weights - much higher chance of winning
  const ownerWeights = [0.1, 0.1, 8, 5, 4, 2.8, 80];
  
  // Normal player's weights - very low chance of winning
  const normalWeights = [75, 24.95, 0.049, 0.0007, 0.0002, 0.0001, 0.00001];

  function getRandomSymbol(isOwner = false, usedSymbols = []) {
    if (isOwner) {
      const weights = ownerWeights;
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalWeight;
      for (let i = 0; i < symbols.length; i++) {
        if (random < weights[i]) return symbols[i];
        random -= weights[i];
      }
      return symbols[0];
    } else {
      const weights = normalWeights;
      if (Math.random() < 0.8 && usedSymbols.length > 0) {
        const unusedSymbols = symbols.filter(s => !usedSymbols.includes(s));
        if (unusedSymbols.length > 0) {
          const unusedWeights = unusedSymbols.map(s => weights[symbols.indexOf(s)]);
          const totalUnusedWeight = unusedWeights.reduce((a, b) => a + b, 0);
          let random = Math.random() * totalUnusedWeight;
          for (let i = 0; i < unusedSymbols.length; i++) {
            if (random < unusedWeights[i]) return unusedSymbols[i];
            random -= unusedWeights[i];
          }
          return unusedSymbols[0];
        }
      }
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalWeight;
      for (let i = 0; i < symbols.length; i++) {
        if (random < weights[i]) return symbols[i];
        random -= weights[i];
      }
      return symbols[0];
    }
  }

  const usedSymbols = [];
  const slot1 = getRandomSymbol(isOwner, usedSymbols);
  usedSymbols.push(slot1);
  const slot2 = getRandomSymbol(isOwner, usedSymbols);
  usedSymbols.push(slot2);
  const slot3 = getRandomSymbol(isOwner, usedSymbols);

  // Calculate win multiplier
  let winMultiplier = 0;
  if (slot1 === slot2 && slot2 === slot3) {
    if (slot1 === '7️⃣') winMultiplier = 20;
    else if (slot1 === '💎') winMultiplier = 15;
    else if (slot1 === '🔔') winMultiplier = 10;
    else winMultiplier = 5;
  } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
    winMultiplier = 2;
  }

  return {
    symbols: [slot1, slot2, slot3],
    winMultiplier,
    isWin: winMultiplier > 0
  };
}

module.exports = {
  getBacayResult,
  getBlackjackResult,
  getSlotResult
};