const { EmbedBuilder } = require('discord.js');
const { defaultUserState } = require('../config/constants');
const { checkLevelUp } = require('../utils/workUtils');
const { getRandomItem } = require('../utils/itemUtils');

module.exports = async function checkinCommand(message, userData, saveData) {
  const userId = message.author.id;
  const guild = message.guild;
  const member = guild.members.cache.get(userId);

  if (!member) {
    return message.reply('Không tìm thấy thành viên!');
  }

  const now = new Date();
  const today = now.toDateString();
  const user = userData[userId] || defaultUserState;

  let rewardMoney = 5000; // Base daily reward
  let rewardXp = 20; // Base XP for checkin

  if (user.lastCheckin) {
    const lastDate = new Date(user.lastCheckin);
    const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      user.streak += 1;
    } else if (diffDays > 1) {
      user.streak = 1; // Reset streak
    }
    // If same day, no reward
    if (diffDays === 0) {
      return message.reply('Bạn đã điểm danh hôm nay rồi!');
    }
  } else {
    user.streak = 1;
  }

  // Bonus for streak
  rewardMoney += user.streak * 2000;
  rewardXp += user.streak;

  // Weekly bonus
  if (user.streak % 7 === 0) {
    rewardMoney += 100000;
    rewardXp += 100;
    message.reply(`**Phần thưởng tuần!** Streak ${user.streak} ngày!`);
  }

  // Monthly bonus
  if (user.streak % 30 === 0) {
    rewardMoney += 1000000;
    rewardXp += 400;
    message.reply(`**Phần thưởng tháng!** Streak ${user.streak} ngày!`);
  }

  user.lastCheckin = today;
  user.totalCheckins += 1;
  user.money += rewardMoney;
  user.xp += rewardXp;

  checkLevelUp(user, message);

  userData[userId] = user;
  saveData(userData);

  const embed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle('Điểm danh thành công! 🎉')
    .setDescription(`Chúc mừng ${message.author.username}!`)
    .addFields(
      { name: '🔥 Streak', value: `${user.streak} ngày`, inline: true },
      { name: '💰 Phần thưởng tiền', value: `${rewardMoney.toLocaleString('vi-VN')} VND`, inline: true },
      { name: '📈 Phần thưởng XP', value: `${rewardXp}`, inline: true },
      { name: '💵 Tổng tiền', value: `${user.money.toLocaleString('vi-VN')} VND`, inline: true },
      { name: '📊 Tổng XP', value: `${user.xp}`, inline: true },
      { name: '📅 Tổng check-in', value: `${user.totalCheckins}`, inline: true }
    )
    .setFooter({ text: 'Hãy tiếp tục streak để nhận thưởng lớn!' });

  await message.reply({ embeds: [embed] });
};