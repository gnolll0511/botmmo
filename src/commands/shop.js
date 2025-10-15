const { EmbedBuilder } = require('discord.js');
const { getRandomItem, getAllItemsList, getShopItemsList, findItemById } = require('../utils/itemUtils');
const { defaultUserState } = require('../config/constants');

function handleShopCommand(message, category = null) {
  const embed = new EmbedBuilder();

  if (!category) {
    // Display shop categories
    embed
      .setTitle('🏪 SHOP')
      .setDescription('Chọn danh mục bạn muốn xem:')
      .addFields(
        { 
          name: '📜 DANH MỤC', 
          value: '👕 `!shop fashion` - Cửa hàng thời trang\n🐱 `!shop pets` - Cửa hàng thú cưng\n🚗 `!shop vehicles` - Cửa hàng phương tiện', 
          inline: false 
        },
        {
          name: '🛍️ CÁCH MUA HÀNG',
          value: 'Sử dụng lệnh `!buy <itemID>` để mua vật phẩm\nVí dụ: `!buy F1`, `!buy P1`, `!buy V1`',
          inline: false
        }
      )
      .setColor('#FF69B4')
      .setFooter({ text: 'Sử dụng !inventory để xem túi đồ của bạn' });
  } else {
    // Display specific category
    if (!['fashion', 'pets', 'vehicles'].includes(category)) {
      return message.reply('Danh mục không hợp lệ! Sử dụng `!shop` để xem danh sách danh mục.');
    }

    const itemsList = getShopItemsList(category, false);
    const categoryTitles = {
      fashion: '👕 CỬA HÀNG THỜI TRANG',
      pets: '🐱 CỬA HÀNG THÚ CƯNG',
      vehicles: '🚗 CỬA HÀNG PHƯƠNG TIỆN'
    };

    embed
      .setTitle(categoryTitles[category])
      .setDescription(itemsList)
      .setColor('#FF69B4')
      .setFooter({ text: 'Sử dụng !buy <itemID> để mua vật phẩm' });
  }

  return message.reply({ embeds: [embed] });
}

function handleBuyCommand(message, args, userData, saveData) {
  const itemId = args[0].toUpperCase();
  const userId = message.author.id;
  const user = userData[userId] || defaultUserState;

  const item = findItemById(itemId);
  if (!item) {
    return message.reply('❌ Mã vật phẩm không hợp lệ!');
  }

  if (item.type !== 'shop') {
    return message.reply('❌ Vật phẩm này không bán trong shop!');
  }

  const price = item.price;
  if (user.money < price) {
    return message.reply(`❌ Bạn không đủ tiền! Bạn cần thêm ${(price - user.money).toLocaleString('vi-VN')} VND nữa.`);
  }

  // Thêm thông tin bổ sung khi mua
  const purchasedItem = {
    ...item,
    purchaseDate: new Date().toISOString(),
    canSell: true
  };

  user.money -= price;
  user.inventory = user.inventory || [];
  user.inventory.push(purchasedItem);
  userData[userId] = user;
  saveData(userData);

  let desc = `✅ Đã mua thành công: **${item.name}**\n💰 Giá: ${price.toLocaleString('vi-VN')} VND\n💵 Số dư còn lại: ${user.money.toLocaleString('vi-VN')} VND`;
  
  if (item.category === 'pets') {
    desc += `\n\n🐾 Thông tin thú cưng:\nLoại: ${item.type}\nThức ăn: ${item.food}`;
  } else if (item.category === 'vehicles') {
    desc += `\n\n🚗 Thông tin phương tiện:\nLoại: ${item.type}\nNhiên liệu: ${item.fuel}`;
  }

  const embed = new EmbedBuilder()
    .setTitle('🛍️ MUA HÀNG THÀNH CÔNG')
    .setDescription(desc)
    .setColor('#00FF00');

  return message.reply({ embeds: [embed] });
}

function handleListitemsCommand(message, userId, ownerId) {
  const isOwner = userId === ownerId;
  const itemsList = getAllItemsList(isOwner);
  
  const embed = new EmbedBuilder()
    .setTitle('📦 DANH SÁCH VẬT PHẨM')
    .setDescription(itemsList)
    .addFields(
      { 
        name: '🎯 Độ Hiếm', 
        value: '⚪ Thường (40%)\n🟢 Phụ kiện (30%)\n🔵 Hiếm (20%)\n🟣 Cực Hiếm (9.99%)\n🟡 Siêu Hiếm (0.0099%)\n🔴 Thần Thoại (0.0001%)', 
        inline: false 
      }
    )
    .setColor('#4169E1');

  if (isOwner) {
    embed.setFooter({ text: '[OWNER] Bạn đang xem danh sách đầy đủ với ID và giá trị' });
  } else {
    embed.setFooter({ text: 'Nhận vật phẩm thông qua: Lên level, Check-in, Event' });
  }

  return message.reply({ embeds: [embed] });
}

module.exports = {
  handleShopCommand,
  handleBuyCommand,
  handleListitemsCommand
};