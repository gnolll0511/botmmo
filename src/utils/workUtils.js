const { EmbedBuilder } = require('discord.js');
const { getLevelInfo } = require('../utils/dataUtils');
const { getRandomItem } = require('../utils/itemUtils');
const { jobs } = require('../config/gameData');

function checkLevelUp(user, message) {
  const { level: newLevel } = getLevelInfo(user.xp);
  if (newLevel > user.lastLevel) {
    if (newLevel % 5 === 0) {
      // Hộp quà: 3 random items + tiền nhỏ
      user.inventory = user.inventory || [];
      const receivedItems = [];
      for (let i = 0; i < 3; i++) {
        const item = getRandomItem();
        user.inventory.push(item);
        receivedItems.push(item.name);
      }
      user.money += 10000; // Tiền nhỏ
      message.reply(`🎉 Chúc mừng lên level ${newLevel}! Nhận hộp quà: ${receivedItems.join(', ')} + 10,000 VND!`);
    } else {
      // Thưởng tiền ngẫu nhiên tăng dần
      const minReward = 20000 + (newLevel - 1) * 5000;
      const maxReward = 50000 + (newLevel - 1) * 10000;
      const levelReward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;
      user.money += levelReward;
      message.reply(`🎉 Chúc mừng lên level ${newLevel}! Thưởng: +${levelReward.toLocaleString('vi-VN')} VND!`);
    }
    user.lastLevel = newLevel;
  }
}

function handleWork(user, now, today, interaction) {
  const job = jobs.find(j => j.name === user.selectedJob);
  if (!job) {
    return interaction.reply('❌ Lỗi: Nghề không tồn tại.');
  }

  // Check và thực hiện công việc chính
  if (!user.lastWork || user.lastWork !== today) {
    // Tiến hành làm việc chính
    const hours = 8;
    const basePay = hours * job.payPerHour;
    let bonus;
    if (job.isCommission) {
      bonus = Math.floor(Math.random() * 150000) + 10000;
    } else {
      bonus = Math.floor(Math.random() * 100000) + 50000;
    }
    const totalPay = basePay + bonus;

    user.money += totalPay;
    user.lastWork = today;
    user.overtimeCount = 0; // Reset số lần làm ngoài giờ mỗi ngày mới

    const workEmbed = new EmbedBuilder()
      .setTitle('🏢 LÀM VIỆC CHÍNH')
      .setColor('#00FF00')
      .addFields(
        { name: '💼 Công việc', value: `${job.name}`, inline: true },
        { name: '⏰ Số giờ', value: `${hours} giờ`, inline: true },
        { name: '💰 Lương cơ bản', value: `${basePay.toLocaleString('vi-VN')} VND`, inline: true },
        { name: '🎁 Thưởng', value: `${bonus.toLocaleString('vi-VN')} VND`, inline: true },
        { name: '💵 Tổng nhận', value: `${totalPay.toLocaleString('vi-VN')} VND`, inline: true },
        { name: '🏦 Số dư', value: `${user.money.toLocaleString('vi-VN')} VND`, inline: true }
      )
      .setFooter({ text: '💡 Bạn có thể làm thêm giờ! Sử dụng !work một lần nữa.' });

    return interaction.reply({ embeds: [workEmbed] });
  }

  // Xử lý làm ngoài giờ
  const maxOvertimePerDay = 3; // Tối đa 3 lần làm ngoài giờ một ngày
  if (user.overtimeCount >= maxOvertimePerDay) {
    return interaction.reply('❌ Bạn đã làm đủ số giờ ngoài giờ cho phép hôm nay (tối đa 3 lần).');
  }

  // Tính lương làm ngoài giờ (50% lương cơ bản)
  const overtimeHours = 4; // Làm thêm 4 giờ mỗi lần
  const overtimePay = Math.floor((overtimeHours * job.payPerHour * 0.5));
  let overtimeBonus = 0;
  if (job.isCommission) {
    overtimeBonus = Math.floor(Math.random() * 50000) + 5000; // Thưởng ngoài giờ thấp hơn
  } else {
    overtimeBonus = Math.floor(Math.random() * 30000) + 10000;
  }
  const totalOvertimePay = overtimePay + overtimeBonus;

  user.money += totalOvertimePay;
  user.overtimeCount = (user.overtimeCount || 0) + 1;

  const overtimeEmbed = new EmbedBuilder()
    .setTitle('🌙 LÀM THÊM GIỜ')
    .setColor('#FFA500')
    .addFields(
      { name: '💼 Công việc', value: `${job.name}`, inline: true },
      { name: '⏰ Số giờ', value: `${overtimeHours} giờ`, inline: true },
      { name: '💰 Lương ngoài giờ', value: `${overtimePay.toLocaleString('vi-VN')} VND`, inline: true },
      { name: '🎁 Thưởng', value: `${overtimeBonus.toLocaleString('vi-VN')} VND`, inline: true },
      { name: '💵 Tổng nhận', value: `${totalOvertimePay.toLocaleString('vi-VN')} VND`, inline: true },
      { name: '🏦 Số dư', value: `${user.money.toLocaleString('vi-VN')} VND`, inline: true },
      { name: '📊 Số lần còn lại', value: `${maxOvertimePerDay - user.overtimeCount} lần`, inline: true }
    );

  return interaction.reply({ embeds: [overtimeEmbed] });
}

module.exports = {
  checkLevelUp,
  handleWork
};