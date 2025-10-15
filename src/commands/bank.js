const { EmbedBuilder } = require('discord.js');
const { createBankingProfile, calculateBankInterest, formatTransactionHistory, addTransaction } = require('../utils/dataUtils');
const { defaultUserState } = require('../config/constants');

function handleBankCommand(message, userData) {
  const userId = message.author.id;
  const user = userData[userId] || defaultUserState;

  if (!user.banking) createBankingProfile(userId, userData);
  
  // Tính lãi trước khi hiển thị
  const interestInfo = calculateBankInterest(userId, userData);

  // Tính lãi suất dự kiến cho lần tiếp theo
  const expectedInterest = Math.floor(user.banking.balance * 0.0002);

  const embed = new EmbedBuilder()
    .setTitle('🏦 NGÂN HÀNG')
    .addFields(
      { name: '💰 Số dư tài khoản', value: `${user.banking.balance.toLocaleString('vi-VN')} VND`, inline: true },
      { name: '💸 Thông tin lãi suất', value: 
        `Tỷ lệ: 0.02% / 5 phút\n` +
        `Lãi vừa nhận: ${interestInfo.interest.toLocaleString('vi-VN')} VND\n` +
        `Lãi dự kiến: ${expectedInterest.toLocaleString('vi-VN')} VND\n` +
        `⏰ Còn ${interestInfo.timeUntilNext} phút tới lần nhận lãi tiếp theo`, inline: false },
      { name: '💵 Tiền mặt', value: `${user.money.toLocaleString('vi-VN')} VND`, inline: true },
      { name: '📅 Ngày mở TK', value: new Date(user.banking.createdAt).toLocaleDateString('vi-VN'), inline: true },
      { name: '📝 DANH SÁCH LỆNH', value: 
        '`!deposit <số tiền>` - Nạp tiền vào tài khoản\n' +
        '`!withdraw <số tiền>` - Rút tiền từ tài khoản\n' +
        '`!transfer <@user> <số tiền> [ghi chú]` - Chuyển tiền cho người khác\n' +
        '`!history` - Xem lịch sử giao dịch', inline: false }
    )
    .setColor('#00FF00');

  return message.reply({ embeds: [embed] });
}

function handleDepositCommand(message, args, userData, saveData) {
  const userId = message.author.id;
  const user = userData[userId] || defaultUserState;

  if (!user.banking) createBankingProfile(userId, userData);

  let amount;
  const amountArg = args[0];
  
  if (amountArg.toLowerCase() === 'all') {
    amount = user.money;
  } else {
    amount = parseInt(amountArg);
  }

  if (!amount || amount <= 0) {
    return message.reply('❌ Số tiền không hợp lệ!\nSử dụng `!deposit all` để nạp toàn bộ tiền mặt.');
  }

  if (user.money < amount) {
    return message.reply('❌ Bạn không đủ tiền mặt để nạp!');
  }

  user.money -= amount;
  user.banking.balance += amount;
  addTransaction(userId, 'deposit', amount, 'Nạp tiền vào tài khoản', null, userData);
  saveData(userData);

  const embed = new EmbedBuilder()
    .setTitle('📥 NẠP TIỀN THÀNH CÔNG')
    .addFields(
      { name: '💰 Số tiền nạp', value: `${amount.toLocaleString('vi-VN')} VND`, inline: true },
      { name: '💳 Số dư mới', value: `${user.banking.balance.toLocaleString('vi-VN')} VND`, inline: true },
      { name: '💵 Tiền mặt còn lại', value: `${user.money.toLocaleString('vi-VN')} VND`, inline: true }
    )
    .setColor('#00FF00');

  return message.reply({ embeds: [embed] });
}

function handleWithdrawCommand(message, args, userData, saveData) {
  const userId = message.author.id;
  const user = userData[userId] || defaultUserState;

  if (!user.banking) createBankingProfile(userId, userData);

  let amount;
  const amountArg = args[0];
  
  if (amountArg.toLowerCase() === 'all') {
    amount = user.banking.balance;
  } else {
    amount = parseInt(amountArg);
  }

  if (!amount || amount <= 0) {
    return message.reply('❌ Số tiền không hợp lệ!\nSử dụng `!withdraw all` để rút toàn bộ số dư.');
  }

  if (user.banking.balance < amount) {
    return message.reply('❌ Số dư tài khoản không đủ!');
  }

  user.banking.balance -= amount;
  user.money += amount;
  addTransaction(userId, 'withdraw', amount, 'Rút tiền từ tài khoản', null, userData);
  saveData(userData);

  const embed = new EmbedBuilder()
    .setTitle('📤 RÚT TIỀN THÀNH CÔNG')
    .addFields(
      { name: '💰 Số tiền rút', value: `${amount.toLocaleString('vi-VN')} VND`, inline: true },
      { name: '💳 Số dư còn lại', value: `${user.banking.balance.toLocaleString('vi-VN')} VND`, inline: true },
      { name: '💵 Tiền mặt hiện có', value: `${user.money.toLocaleString('vi-VN')} VND`, inline: true }
    )
    .setColor('#00FF00');

  return message.reply({ embeds: [embed] });
}

function handleTransferCommand(message, args, userData, saveData) {
  const userId = message.author.id;
  const user = userData[userId] || defaultUserState;

  if (!user.banking) createBankingProfile(userId, userData);

  if (args.length < 2) {
    return message.reply('❌ Cú pháp: `!transfer <@user> <số tiền> [ghi chú]`');
  }

  const targetId = args[0].replace(/[<@!>]/g, '');
  if (targetId === userId) {
    return message.reply('❌ Bạn không thể chuyển tiền cho chính mình!');
  }

  let amount;
  if (args[1].toLowerCase() === 'all') {
    amount = user.banking.balance;
    if (amount <= 0) {
      return message.reply('❌ Số dư tài khoản của bạn là 0 VND!');
    }
  } else {
    amount = parseInt(args[1]);
    if (isNaN(amount)) {
      return message.reply('❌ Số tiền không hợp lệ!\n💡 Ví dụ: `!transfer <@user> 100000` hoặc `!transfer <@user> all`');
    }
  }

  if (amount < 1) {
    return message.reply('❌ Số tiền chuyển phải lớn hơn 0 VND!');
  }

  if (user.banking.balance < amount) {
    return message.reply(`❌ Số dư tài khoản không đủ!\n💰 Số dư hiện tại: ${user.banking.balance.toLocaleString('vi-VN')} VND`);
  }

  const targetUser = userData[targetId];
  if (!targetUser) {
    return message.reply('❌ Không tìm thấy người nhận!');
  }

  if (!targetUser.banking) createBankingProfile(targetId, userData);

  const note = args.slice(2).join(' ') || 'Không có ghi chú';

  // Thực hiện chuyển tiền
  user.banking.balance -= amount;
  targetUser.banking.balance += amount;

  // Ghi transaction cho cả 2 bên
  addTransaction(userId, 'transfer_out', amount, note, targetId, userData);
  addTransaction(targetId, 'transfer_in', amount, note, userId, userData);
  
  saveData(userData);

  const embed = new EmbedBuilder()
    .setTitle('💸 CHUYỂN TIỀN THÀNH CÔNG')
    .addFields(
      { name: '👥 Người nhận', value: `<@${targetId}>`, inline: true },
      { name: '💰 Số tiền', value: `${amount.toLocaleString('vi-VN')} VND`, inline: true },
      { name: '💳 Số dư còn lại', value: `${user.banking.balance.toLocaleString('vi-VN')} VND`, inline: true },
      { name: '💬 Ghi chú', value: note, inline: false }
    )
    .setColor('#00FF00');

  message.reply({ embeds: [embed] });

  // Gửi thông báo cho người nhận
  const notifyEmbed = new EmbedBuilder()
    .setTitle('💰 NHẬN TIỀN THÀNH CÔNG')
    .addFields(
      { name: '👤 Người gửi', value: `<@${userId}>`, inline: true },
      { name: '💰 Số tiền', value: `${amount.toLocaleString('vi-VN')} VND`, inline: true },
      { name: '💳 Số dư mới', value: `${targetUser.banking.balance.toLocaleString('vi-VN')} VND`, inline: true },
      { name: '💬 Ghi chú', value: note, inline: false }
    )
    .setColor('#00FF00');

  const targetMember = message.guild.members.cache.get(targetId);
  if (targetMember) {
    targetMember.send({ embeds: [notifyEmbed] }).catch(() => {
      // Nếu không gửi được DM, gửi vào kênh hiện tại
      message.channel.send({ content: `<@${targetId}>`, embeds: [notifyEmbed] });
    });
  }
}

function handleHistoryCommand(message, userData, saveData) {
  const userId = message.author.id;
  const user = userData[userId] || defaultUserState;

  if (!user.banking) createBankingProfile(userId, userData);
  
  // Tính lãi trước khi hiển thị lịch sử
  calculateBankInterest(userId, userData);

  const history = formatTransactionHistory(user.banking.transactions, userData);
  
  const embed = new EmbedBuilder()
    .setTitle('📜 LỊCH SỬ GIAO DỊCH')
    .setDescription(history)
    .addFields(
      { name: '💳 Số dư hiện tại', value: `${user.banking.balance.toLocaleString('vi-VN')} VND`, inline: true },
      { name: '💵 Tiền mặt', value: `${user.money.toLocaleString('vi-VN')} VND`, inline: true }
    )
    .setColor('#4169E1')
    .setFooter({ text: 'Hiển thị 10 giao dịch gần nhất' });

  return message.reply({ embeds: [embed] });
}

module.exports = {
  handleBankCommand,
  handleDepositCommand,
  handleWithdrawCommand,
  handleTransferCommand,
  handleHistoryCommand
};