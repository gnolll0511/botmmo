const { EmbedBuilder } = require('discord.js');

// Import the state from index.js
const { state, config } = require('../index.new.js');

function handleAdminCommand(message, command, args) {
  // Check if user is owner
  if (message.author.id !== config.ownerId) {
    message.reply('❌ Chỉ owner mới có thể dùng lệnh này.');
    return;
  }

  try {
    switch (command) {
      case 'setmoney':
        handleSetMoney(message, args);
        break;

      case 'addmoney':
        handleAddMoney(message, args);
        break;

      case 'resetdata':
      case 'rd':
        handleResetData(message, args);
        break;

      // Add more admin commands...
    }
  } catch (error) {
    console.error('[ERROR] Admin command failed:', error);
    message.reply('❌ Có lỗi xảy ra khi xử lý lệnh.');
  }
}

function handleSetMoney(message, args) {
  // Get target user
  const targetId = args[0].replace(/[<@!>]/g, '');
  const amount = parseInt(args[1]);

  if (!amount || amount < 0) {
    message.reply('❌ Số tiền không hợp lệ.');
    return;
  }

  // Initialize user data if needed
  state.userData[targetId] = state.userData[targetId] || {
    money: 0,
    level: 1,
    xp: 0
  };

  state.userData[targetId].money = amount;
  
  message.reply(`✅ Đã set tiền của <@${targetId}> thành ${amount.toLocaleString('vi-VN')} VND`);
}

function handleAddMoney(message, args) {
  const targetId = args[0].replace(/[<@!>]/g, '');
  const amount = parseInt(args[1]);

  if (!amount) {
    message.reply('❌ Số tiền không hợp lệ.');
    return;
  }

  // Initialize user data if needed  
  state.userData[targetId] = state.userData[targetId] || {
    money: 0,
    level: 1,
    xp: 0
  };

  state.userData[targetId].money += amount;

  message.reply(`✅ Đã ${amount >= 0 ? 'thêm' : 'trừ'} ${Math.abs(amount).toLocaleString('vi-VN')} VND cho <@${targetId}>`);
}

function handleResetData(message, args) {
  const targetId = args[0]?.replace(/[<@!>]/g, '') || message.author.id;

  // Only owner can reset others' data
  if (targetId !== message.author.id && message.author.id !== config.ownerId) {
    message.reply('❌ Bạn chỉ có thể reset data của chính mình.');
    return;
  }

  delete state.userData[targetId];
  state.profileProcessing.delete(targetId);
  state.lastMessageTime.delete(targetId);
  
  message.reply(`✅ Đã reset data của <@${targetId}>.`);
}

// Export the handler
module.exports = handleAdminCommand;