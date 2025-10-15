const { EmbedBuilder } = require('discord.js');
const { getLevelInfo } = require('../utils/dataUtils');
const { defaultUserState } = require('../config/constants');

module.exports = async function profileCommand(message, userData) {
  console.log('Profile command used by', message.author.username);
  const userId = message.author.id;
  const user = userData[userId] || defaultUserState;

  const { level, nextXp } = getLevelInfo(user.xp);

  const embed = new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle(`Profile của ${message.author.username}`)
    .setThumbnail(message.author.displayAvatarURL())
    .addFields(
      { name: '💵 Tiền', value: `${user.money.toLocaleString('vi-VN')} VND`, inline: true },
      { name: '📊 XP', value: `${user.xp}`, inline: true },
      { name: '🏆 Level', value: `${level}`, inline: true },
      { name: '🔥 Streak', value: `${user.streak} ngày`, inline: true },
      { name: '📅 Tổng check-in', value: `${user.totalCheckins}`, inline: true },
      { name: '⬆️ XP cần cho level tiếp', value: `${nextXp}`, inline: true },
      { name: '💼 Nghề nghiệp', value: user.selectedJob || 'Chưa chọn nghề', inline: true }
    )
    .setFooter({ text: 'Tiếp tục check-in để tăng level và tiền!' });

  await message.reply({ embeds: [embed] });
};