const { token, ownerId } = require('../config/config.js');
const { rareItems, shopItems } = require('../config/items.js');

function findItemById(searchId) {
  // Tìm trong rare items
  for (const rarity in rareItems) {
    const item = rareItems[rarity].find(item => item.id === searchId);
    if (item) return { ...item, rarity, type: 'rare' };
  }
  
  // Tìm trong shop items
  for (const category in shopItems) {
    const item = shopItems[category].find(item => 
      item.id === searchId || item.displayId === searchId);
    if (item) return { ...item, category, type: 'shop' };
  }
  
  return null;
}

function getRandomItem() {
  const rand = Math.random();
  let rarity;
  if (rand < 0.4) rarity = 'basic';              // 40%
  else if (rand < 0.7) rarity = 'accessory';       // 30%
  else if (rand < 0.9) rarity = 'ultra';           // 20%
  else if (rand < 0.9999) rarity = 'ultra_rare';   // 9.99%
  else if (rand < 0.999999) rarity = 'super_ultra_rare'; // 0.0099%
  else rarity = 'ssur';                            // 0.0001%

  const list = rareItems[rarity];
  return list[Math.floor(Math.random() * list.length)];
}

function getAllItemsList(showDetails = false) {
  let result = '';
  const rarityEmojis = {
    basic: '⚪',
    accessory: '🟢',
    ultra: '🔵',
    ultra_rare: '🟣',
    super_ultra_rare: '🟡',
    ssur: '🔴'
  };
  
  const rarityNames = {
    basic: 'Thường',
    accessory: 'Phụ kiện',
    ultra: 'Hiếm',
    ultra_rare: 'Cực Hiếm',
    super_ultra_rare: 'Siêu Hiếm',
    ssur: 'Thần Thoại'
  };

  result += '**🎁 VẬT PHẨM HIẾM (EVENT/HỘP QUÀ):**\n';
  for (const rarity in rareItems) {
    result += `\n${rarityEmojis[rarity]} **${rarityNames[rarity].toUpperCase()}:**\n`;
    rareItems[rarity].forEach(item => {
      if (showDetails) {
        result += `${item.id} - ${item.name} (${item.sellPrice.toLocaleString('vi-VN')} VND)\n`;
      } else {
        result += `${item.name}\n`;
      }
    });
  }
  return result;
}

function getShopItemsList(category = null, showDetails = false) {
  const categoryEmojis = {
    fashion: '👕',
    pets: '🐱',
    vehicles: '🚗'
  };

  const categoryNames = {
    fashion: 'THỜI TRANG',
    pets: 'THÚ CƯNG',
    vehicles: 'PHƯƠNG TIỆN'
  };

  let result = '';
  
  if (category) {
    // Hiển thị một danh mục
    const items = shopItems[category];
    if (!items) return 'Danh mục không tồn tại!';

    result = `${categoryEmojis[category]} **${categoryNames[category]}:**\n\n`;
    items.forEach(item => {
      if (showDetails) {
        let details = `${item.displayId} | ${item.name} (${item.price.toLocaleString('vi-VN')} VND)`;
        if (item.type) details += `\nLoại: ${item.type}`;
        if (item.food) details += `\nThức ăn: ${item.food}`;
        if (item.fuel) details += `\nNhiên liệu: ${item.fuel}`;
        if (item.rarity) details += `\nĐộ hiếm: ${item.rarity}`;
        if (item.brand) details += `\nThương hiệu: ${item.brand}`;
        result += `${details}\n\n`;
      } else {
        result += `${item.displayId} | ${item.name} - ${item.price.toLocaleString('vi-VN')} VND\n`;
      }
    });
  } else {
    // Hiển thị tất cả danh mục
    for (const cat in shopItems) {
      result += `${categoryEmojis[cat]} **${categoryNames[cat]}:**\n`;
      shopItems[cat].forEach(item => {
        if (showDetails) {
          let details = `${item.id} - ${item.name} (${item.price.toLocaleString('vi-VN')} VND)`;
          if (item.type) details += `\nLoại: ${item.type}`;
          if (item.food) details += `\nThức ăn: ${item.food}`;
          if (item.fuel) details += `\nNhiên liệu: ${item.fuel}`;
          result += `${details}\n\n`;
        } else {
          result += `${item.name} - ${item.price.toLocaleString('vi-VN')} VND\n`;
        }
      });
      result += '\n';
    }
  }
  
  return result;
}

module.exports = {
  findItemById,
  getRandomItem,
  getAllItemsList,
  getShopItemsList
};