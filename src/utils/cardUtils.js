function getCardValue(card) {
  if (card === 'A') return 11;
  if (['J', 'Q', 'K'].includes(card)) return 10;
  return parseInt(card);
}

function getHandValue(hand) {
  let value = 0;
  let aces = 0;
  for (let card of hand) {
    if (card === 'A') {
      aces++;
      value += 11;
    } else if (['J', 'Q', 'K'].includes(card)) {
      value += 10;
    } else {
      value += parseInt(card);
    }
  }
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return value;
}

function createDeck() {
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = [];
  for (let suit of suits) {
    for (let value of values) {
      deck.push(value + suit);
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function drawCard(deck, isDealer = false, isDealerFirstDraw = false, dealerFirstCard = null) {
  if (isDealer) {
    if (isDealerFirstDraw) {
      // 30% cơ hội nhà cái được A trong lá đầu tiên
      if (Math.random() < 0.3) {
        const aceCard = deck.find(card => card[0] === 'A');
        if (aceCard) {
          const index = deck.indexOf(aceCard);
          deck.splice(index, 1);
          return aceCard;
        }
      }
    } else if (dealerFirstCard && dealerFirstCard[0] === 'A') {
      // Nếu lá đầu là A, 40% cơ hội lá thứ 2 là 10, J, Q, K
      if (Math.random() < 0.4) {
        const tenCard = deck.find(card => ['10', 'J', 'Q', 'K'].includes(card[0]));
        if (tenCard) {
          const index = deck.indexOf(tenCard);
          deck.splice(index, 1);
          return tenCard;
        }
      }
    } else if (dealerFirstCard && ['10', 'J', 'Q', 'K'].includes(dealerFirstCard[0])) {
      // Nếu lá đầu là 10/J/Q/K, 40% cơ hội lá thứ 2 là A
      if (Math.random() < 0.4) {
        const aceCard = deck.find(card => card[0] === 'A');
        if (aceCard) {
          const index = deck.indexOf(aceCard);
          deck.splice(index, 1);
          return aceCard;
        }
      }
    } else if (Math.random() < 0.6) { // 60% cơ hội nhà cái được bài tốt cho các lần rút khác
      const lastFiveCards = deck.slice(-5);
      const highCard = lastFiveCards.find(card => ['J', 'Q', 'K', 'A'].includes(card[0]));
      if (highCard) {
        const index = deck.indexOf(highCard);
        deck.splice(index, 1);
        return highCard;
      }
    }
  }
  return deck.pop();
}

function getCardDisplay(card) {
  return `\`${card}\``;
}

module.exports = {
  getCardValue,
  getHandValue,
  createDeck,
  shuffleDeck,
  drawCard,
  getCardDisplay
};