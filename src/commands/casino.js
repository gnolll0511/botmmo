const { EmbedBuilder } = require('discord.js');

// Utility functions
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

function drawCard(deck, isDealer = false, isDealerFirstDraw = false, dealerFirstCard = null) {
  if (isDealer) {
    if (isDealerFirstDraw && Math.random() < 0.3) {
      const aceCard = deck.find(card => card[0] === 'A');
      if (aceCard) {
        const index = deck.indexOf(aceCard);
        deck.splice(index, 1);
        return aceCard;
      }
    }
    if (dealerFirstCard && dealerFirstCard[0] === 'A' && Math.random() < 0.4) {
      const tenCard = deck.find(card => ['10', 'J', 'Q', 'K'].includes(card[0]));
      if (tenCard) {
        const index = deck.indexOf(tenCard);
        deck.splice(index, 1);
        return tenCard;
      }
    }
    if (dealerFirstCard && ['10', 'J', 'Q', 'K'].includes(dealerFirstCard[0]) && Math.random() < 0.4) {
      const aceCard = deck.find(card => card[0] === 'A');
      if (aceCard) {
        const index = deck.indexOf(aceCard);
        deck.splice(index, 1);
        return aceCard;
      }
    }
  }
  return deck.pop();
}

function getCardDisplay(card) {
  return `\`${card}\``;
}

// Casino command handlers
async function handleBaCay(message, betAmount, userData, saveData) {
  const deck = shuffleDeck(createDeck());
  const playerCards = [drawCard(deck), drawCard(deck), drawCard(deck)];
  const dealerCards = [drawCard(deck, true), drawCard(deck, true), drawCard(deck, true)];

  const playerValue = (getCardValue(playerCards[0].slice(0, -1)) + 
                      getCardValue(playerCards[1].slice(0, -1)) + 
                      getCardValue(playerCards[2].slice(0, -1))) % 10;
  const dealerValue = (getCardValue(dealerCards[0].slice(0, -1)) + 
                      getCardValue(dealerCards[1].slice(0, -1)) + 
                      getCardValue(dealerCards[2].slice(0, -1))) % 10;
  
  // Check for royal cards (J, Q, K)
  function checkRoyalCards(cards) {
    return cards.filter(card => ['J', 'Q', 'K'].includes(card.slice(0, -1))).length === 3;
  }
  
  const playerHasRoyal = checkRoyalCards(playerCards);
  const dealerHasRoyal = checkRoyalCards(dealerCards);

  const resultEmbed = new EmbedBuilder()
    .setTitle('🎴 BA CÂY')
    .addFields(
      { name: '🎲 Bài của bạn', value: `${playerCards.map(getCardDisplay).join(' ')} = **${playerValue}**${playerHasRoyal ? ' (Ba Già!)' : ''}`, inline: true },
      { name: '🎲 Bài nhà cái', value: `${dealerCards.map(getCardDisplay).join(' ')} = **${dealerValue}**${dealerHasRoyal ? ' (Ba Già!)' : ''}`, inline: true }
    );

  const user = userData;
  if (playerHasRoyal && !dealerHasRoyal) {
    user.money += betAmount * 2;
    resultEmbed.setDescription(`🎉 **THẮNG X2!** +${(betAmount * 2).toLocaleString('vi-VN')}`);
    resultEmbed.setColor('#00FF00');
  } else if (dealerHasRoyal && !playerHasRoyal) {
    user.money -= betAmount;
    resultEmbed.setDescription(`😢 **THUA!** -${betAmount.toLocaleString('vi-VN')}`);
    resultEmbed.setColor('#FF0000');
  } else if (playerHasRoyal && dealerHasRoyal) {
    resultEmbed.setDescription('🤝 **HÒA!** Hoàn tiền');
    resultEmbed.setColor('#FFFF00');
  } else if (playerValue > dealerValue) {
    user.money += betAmount;
    resultEmbed.setDescription(`🎉 **THẮNG!** +${betAmount.toLocaleString('vi-VN')}`);
    resultEmbed.setColor('#00FF00');
  } else if (playerValue < dealerValue) {
    user.money -= betAmount;
    resultEmbed.setDescription(`😢 **THUA!** -${betAmount.toLocaleString('vi-VN')}`);
    resultEmbed.setColor('#FF0000');
  } else {
    resultEmbed.setDescription('🤝 **HÒA!** Hoàn tiền');
    resultEmbed.setColor('#FFFF00');
  }

  resultEmbed.addFields({ name: '💰 Số dư', value: user.money.toLocaleString('vi-VN'), inline: true });
  saveData();
  return message.reply({ embeds: [resultEmbed] });
}

async function handleBlackjack(message, betAmount, userData, saveData) {
  const deck = shuffleDeck(createDeck());
  const playerHand = [drawCard(deck), drawCard(deck)];
  const dealerFirstCard = drawCard(deck, true, true);
  const dealerSecondCard = drawCard(deck, true, false, dealerFirstCard);
  const dealerHand = [dealerFirstCard, dealerSecondCard];

  let playerValue = getHandValue(playerHand.map(c => c.slice(0, -1)));
  let dealerValue = getHandValue(dealerHand.map(c => c.slice(0, -1)));

  const gameEmbed = new EmbedBuilder()
    .setTitle('🃏 XÌ DÁCH')
    .addFields(
      { name: '🎲 Bài của bạn', value: `${playerHand.map(getCardDisplay).join(' ')} = **${playerValue}**`, inline: true },
      { name: '🎲 Bài nhà cái', value: `${getCardDisplay(dealerHand[0])} 🎴`, inline: true },
      { name: '❓', value: '👍 Rút thêm | 👎 Dừng lại', inline: true }
    )
    .setColor('#0099FF');

  const bjMsg = await message.reply({ embeds: [gameEmbed] });
  await bjMsg.react('👍');
  await bjMsg.react('👎');

  const filter = (reaction, user) => ['👍', '👎'].includes(reaction.emoji.name) && user.id === message.author.id;
  const collector = bjMsg.createReactionCollector({ filter, time: 30000 });

  let playerBusted = false;
  collector.on('collect', async (reaction) => {
    if (reaction.emoji.name === '👍') {
      playerHand.push(drawCard(deck));
      playerValue = getHandValue(playerHand.map(c => c.slice(0, -1)));
      if (playerValue > 21) {
        playerBusted = true;
        collector.stop();
      } else {
        gameEmbed.spliceFields(0, 3,
          { name: '🎲 Bài của bạn', value: `${playerHand.map(getCardDisplay).join(' ')} = **${playerValue}**`, inline: true },
          { name: '🎲 Bài nhà cái', value: `${getCardDisplay(dealerHand[0])} 🎴`, inline: true },
          { name: '❓', value: '👍 Rút thêm | 👎 Dừng lại', inline: true }
        );
        await bjMsg.edit({ embeds: [gameEmbed] });
      }
    } else {
      collector.stop();
    }
  });

  collector.on('end', async () => {
    await bjMsg.reactions.removeAll();

    while (dealerValue < 15 && !playerBusted) {
      dealerHand.push(drawCard(deck));
      dealerValue = getHandValue(dealerHand.map(c => c.slice(0, -1)));
    }

    const resultEmbed = new EmbedBuilder()
      .setTitle('🃏 XÌ DÁCH')
      .addFields(
        { name: '🎲 Bài của bạn', value: `${playerHand.map(getCardDisplay).join(' ')} = **${playerValue}**`, inline: true },
        { name: '🎲 Bài nhà cái', value: `${dealerHand.map(getCardDisplay).join(' ')} = **${dealerValue}**`, inline: true }
      );

    const user = userData;
    if (playerBusted) {
      user.money -= betAmount;
      resultEmbed.setDescription(`💥 **QUẮC!** -${betAmount.toLocaleString('vi-VN')}`);
      resultEmbed.setColor('#FF0000');
    } else if (dealerValue > 21) {
      const winAmount = Math.floor(betAmount * 1.5);
      user.money += winAmount;
      resultEmbed.setDescription(`🎉 **THẮNG!** +${winAmount.toLocaleString('vi-VN')}`);
      resultEmbed.setColor('#00FF00');
    } else if (playerValue > dealerValue) {
      const winAmount = Math.floor(betAmount * 1.5);
      user.money += winAmount;
      resultEmbed.setDescription(`🎉 **THẮNG!** +${winAmount.toLocaleString('vi-VN')}`);
      resultEmbed.setColor('#00FF00');
    } else if (playerValue < dealerValue) {
      user.money -= betAmount;
      resultEmbed.setDescription(`😢 **THUA!** -${betAmount.toLocaleString('vi-VN')}`);
      resultEmbed.setColor('#FF0000');
    } else {
      resultEmbed.setDescription('🤝 **HÒA!** Hoàn tiền');
      resultEmbed.setColor('#FFFF00');
    }

    resultEmbed.addFields({ name: '💰 Số dư', value: user.money.toLocaleString('vi-VN'), inline: true });
    saveData();
    message.reply({ embeds: [resultEmbed] });
  });
}

function handleCoinFlip(message, betAmount, choice, userData, saveData) {
  const result = Math.random() < (choice === '👑' ? 0.4 : 0.5) ? '👑' : '🦅';
  
  const resultEmbed = new EmbedBuilder()
    .setTitle('🪙 TUNG XU')
    .addFields(
      { name: '🎯 Bạn chọn', value: choice === '👑' ? 'Mặt Ngửa 👑' : 'Mặt Sấp 🦅', inline: true },
      { name: '🎲 Kết quả', value: result === '👑' ? 'Mặt Ngửa 👑' : 'Mặt Sấp 🦅', inline: true }
    );

  const user = userData;
  if (choice === result) {
    user.money += betAmount;
    resultEmbed.setDescription(`🎉 **THẮNG!** +${betAmount.toLocaleString('vi-VN')}`);
    resultEmbed.setColor('#00FF00');
  } else {
    user.money -= betAmount;
    resultEmbed.setDescription(`😢 **THUA!** -${betAmount.toLocaleString('vi-VN')}`);
    resultEmbed.setColor('#FF0000');
  }

  resultEmbed.addFields({ name: '💰 Số dư', value: user.money.toLocaleString('vi-VN'), inline: true });
  saveData();
  return message.reply({ embeds: [resultEmbed] });
}

function handleSlot(message, betAmount, userData, saveData, isOwner) {
  const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '7️⃣'];
  const weights = isOwner ? 
    [0.1, 0.1, 8, 5, 4, 2.8, 80] :  // Owner weights
    [75, 24.95, 0.049, 0.0007, 0.0002, 0.0001, 0.00001];  // Normal weights

  function getRandomSymbol(usedSymbols = []) {
    if (!isOwner && Math.random() < 0.8 && usedSymbols.length > 0) {
      const unusedSymbols = symbols.filter(s => !usedSymbols.includes(s));
      if (unusedSymbols.length > 0) {
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        for (let i = 0; i < symbols.length; i++) {
          if (random < weights[i]) return symbols[i];
          random -= weights[i];
        }
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

  const usedSymbols = [];
  const slot1 = getRandomSymbol(usedSymbols);
  usedSymbols.push(slot1);
  const slot2 = getRandomSymbol(usedSymbols);
  usedSymbols.push(slot2);
  const slot3 = getRandomSymbol(usedSymbols);

  const slotEmbed = new EmbedBuilder()
    .setTitle('🎰 SLOT')
    .setDescription(`\n[ ${slot1} ${slot2} ${slot3} ]\n`);

  const user = userData;
  let winMultiplier = 0;
  if (slot1 === slot2 && slot2 === slot3) {
    if (slot1 === '7️⃣') winMultiplier = 20;
    else if (slot1 === '💎') winMultiplier = 15;
    else if (slot1 === '🔔') winMultiplier = 10;
    else winMultiplier = 5;
  } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
    winMultiplier = 2;
  }

  if (winMultiplier > 0) {
    const winAmount = betAmount * winMultiplier;
    user.money += winAmount;
    slotEmbed.setDescription(`\n[ ${slot1} ${slot2} ${slot3} ]\n🎉 **THẮNG X${winMultiplier}!** +${winAmount.toLocaleString('vi-VN')}`);
    slotEmbed.setColor('#00FF00');
  } else {
    user.money -= betAmount;
    slotEmbed.setDescription(`\n[ ${slot1} ${slot2} ${slot3} ]\n😢 **THUA!** -${betAmount.toLocaleString('vi-VN')}`);
    slotEmbed.setColor('#FF0000');
  }

  slotEmbed.addFields({ name: '💰 Số dư', value: user.money.toLocaleString('vi-VN'), inline: true });
  saveData();
  return message.reply({ embeds: [slotEmbed] });
}

module.exports = {
  handleBaCay,
  handleBlackjack,
  handleCoinFlip,
  handleSlot
};