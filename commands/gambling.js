const { EmbedBuilder } = require('discord.js');

// Import the state from index.js
const { state } = require('../index.new.js');

function handleGamblingCommand(message, command, args) {
  try {
    switch (command) {
      case 'slot':
      case 'sl':
        handleSlot(message, args);
        break;
        
      case 'blackjack':
      case 'bj':
      case 'xidach':
      case 'xd':
        handleBlackjack(message, args); 
        break;

      // Add more gambling commands...
    }
  } catch (error) {
    console.error('[ERROR] Gambling command failed:', error);
    message.reply('❌ Có lỗi xảy ra khi xử lý lệnh.');
  }
}

function handleSlot(message, args) {
  const betAmount = args[0] === 'all' ? 
    state.userData[message.author.id].money :
    parseInt(args[0]);

  if (!betAmount || betAmount <= 0) {
    message.reply('❌ Vui lòng đặt cược một số tiền hợp lệ.');
    return; 
  }

  // Add slot logic...
}

function handleBlackjack(message, args) {
  const betAmount = args[0] === 'all' ?
    state.userData[message.author.id].money :
    parseInt(args[0]);

  if (!betAmount || betAmount <= 0) {
    message.reply('❌ Vui lòng đặt cược một số tiền hợp lệ.');
    return;
  }

  // Add blackjack logic...
}

// Export the handler
module.exports = handleGamblingCommand;