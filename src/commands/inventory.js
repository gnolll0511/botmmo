const { EmbedBuilder } = require('discord.js');
const { defaultUserState } = require('../config/constants');

module.exports = async function inventoryCommand(message, userData) {
  const user = userData[message.author.id] || defaultUserState;
  
  if (!user.inventory || user.inventory.length === 0) {
    return message.reply('Túi đồ trống!');
  }
  
  let desc = '';
  user.inventory.forEach((item, index) => {
    desc += `${index + 1}. ${item.name} - Bán: ${item.sellPrice.toLocaleString('vi-VN')} VND\n`;
  });
  
  const embed = new EmbedBuilder()
    .setTitle(`Túi đồ của ${message.author.username}`)
    .setDescription(desc)
    .setColor('#FFA500');
    
  await message.reply({ embeds: [embed] });
};