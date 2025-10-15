const { EmbedBuilder } = require('discord.js');

module.exports = async function helpCommand(message) {
  const helpEmbed = new EmbedBuilder()
    .setTitle('📚 HƯỚNG DẪN SỬ DỤNG BOT')
    .setColor('#0099FF')
    .setDescription('Danh sách các lệnh có sẵn:')
    .addFields(
      { 
        name: '💰 LỆNH CƠ BẢN', 
        value: '`!ping` - Kiểm tra bot\n`!help` - Hiển thị hướng dẫn\n`!checkin` - Điểm danh hàng ngày\n`!profile` - Xem profile của bạn\n`!inventory` - Xem túi đồ\n`!sell <số>` - Bán item (VD: !sell 1)\n`!resetdata` - Reset data của bạn',
        inline: false 
      },
      { 
        name: '💼 LỆNH NGHỀ NGHIỆP', 
        value: '`!timviec` - Tìm việc làm (chọn nghề qua reaction)\n`!work` - Làm việc để kiếm tiền (1 lần/ngày)',
        inline: false 
      },
      { 
        name: '🎰 LỆNH CASINO', 
        value: '`!bacay <tiền>` - Ba cây (Tỷ lệ 1:1)\n`!xidach <tiền>` - Xì dách/Blackjack (Tỷ lệ 1:1.5)\n`!ngua <tiền>` - Tung xu mặt ngửa (Tỷ lệ 1:1)\n`!sap <tiền>` - Tung xu mặt sấp (Tỷ lệ 1:1)\n`!slot <tiền>` - Quay slot (Tỷ lệ lên đến 1:20)\n\n💡 **Mẹo:** Dùng `all` thay vì số tiền để cược toàn bộ!\nVí dụ: `!bacay all`, `!slot all`',
        inline: false 
      },
      {
        name: '🏦 NGÂN HÀNG',
        value: '`!bank` - Xem thông tin tài khoản ngân hàng\n`!deposit <số tiền>` - Nạp tiền vào tài khoản\n`!withdraw <số tiền>` - Rút tiền từ tài khoản\n`!transfer <@user> <số tiền> [ghi chú]` - Chuyển tiền cho người khác\n`!history` - Xem lịch sử giao dịch',
        inline: false
      },
      {
        name: '🛍️ CỬA HÀNG',
        value: '`!shop` - Xem danh sách cửa hàng\n`!shop fashion` - Cửa hàng thời trang\n`!shop pets` - Cửa hàng thú cưng\n`!shop vehicles` - Cửa hàng phương tiện\n`!buy <ID>` - Mua vật phẩm (VD: !buy F1)',
        inline: false
      },
      {
        name: '📊 XẾP HẠNG',
        value: '`!toprich` - Top 10 người giàu nhất\n`!toplevel` - Top 10 level cao nhất',
        inline: false
      },
      { 
        name: '📋 THÔNG TIN THÊM', 
        value: '• Điểm danh liên tục để tăng streak và nhận thưởng lớn!\n• Level tăng qua XP từ chat, voice, check-in\n• Mỗi 5 level nhận hộp quà 3 item\n• Casino: Jackpot 7️⃣ trong slot = x20 tiền cược!\n• Dùng `!transfer <@user> all` để chuyển toàn bộ số dư\n• Voice chat nhận 20 XP/phút',
        inline: false 
      }
    )
    .setFooter({ text: '🎮 MAN88 Bot - Chúc bạn chơi vui vẻ!' })
    .setTimestamp();

  await message.reply({ embeds: [helpEmbed] });
};