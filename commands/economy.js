const { EmbedBuilder } = require('discord.js');

// Import the state from index.js
const { state } = require('../index.new.js');

function handleEconomyCommand(message, command, args) {
  try {
    switch (command) {
      case 'profile':
      case 'pf':
        showProfile(message);
        break;
      
      case 'checkin':
      case 'ci': 
        handleCheckin(message);
        break;
        
      // Add more commands...
    }
  } catch (error) {
    console.error('[ERROR] Economy command failed:', error);
    message.reply('❌ Có lỗi xảy ra khi xử lý lệnh.');
  }
}

function showProfile(message) {
  const user = state.userData[message.author.id];
  if (!user) {
    message.reply('❌ Bạn chưa có profile. Hãy dùng !checkin để tạo profile.');
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`Profile của ${message.author.username}`) 
    .setColor('#0099FF')
    .addFields(
      { name: '💰 Tiền', value: user.money.toString(), inline: true },
      { name: '📊 Level', value: user.level.toString(), inline: true },
      { name: '⭐ XP', value: user.xp.toString(), inline: true }
    );

  message.reply({ embeds: [embed] });
}

// Export the handler
module.exports = handleEconomyCommand;