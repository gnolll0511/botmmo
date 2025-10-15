const { token, ownerId } = require('./config.js');

const profileProcessing = new Map();
const commandCooldown = new Map();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');

console.log('Starting bot...');
console.log('Initializing client...');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// Khởi tạo event handlers
function setupEventHandlers() {
  // Debug events
  client.on('debug', info => console.log('Debug:', info));
  client.on('warn', info => console.log('Warning:', info));
  client.on('error', error => console.error('Error:', error));

  // Ready event
  client.once('ready', () => {
    console.log('=========================');
    console.log(`Bot is ready!`);
    console.log(`Logged in as: ${client.user.tag}`);
    console.log(`Bot ID: ${client.user.id}`);
    console.log(`Connected to ${client.guilds.cache.size} servers`);
    console.log('=========================');
  });

  // Voice state handler
  client.on('voiceStateUpdate', (oldState, newState) => {
    const userId = newState.id;
    const user = userData[userId] || { 
      lastCheckin: null, streak: 0, totalCheckins: 0, 
      money: 0, xp: 0, voiceJoinTime: null, lastLevel: 1, 
      inventory: [], isSearchingJob: false 
    };

    if (!oldState.channel && newState.channel) {
      user.voiceJoinTime = Date.now();
    } else if (oldState.channel && !newState.channel) {
      if (user.voiceJoinTime) {
        const timeInVoice = Date.now() - user.voiceJoinTime;
        const xpGain = Math.floor(timeInVoice / 60000) * 20;
        user.xp += xpGain;
        user.voiceJoinTime = null;
      }
    }

    userData[userId] = user;
    saveData();
  });

  // Message handler
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // XP for chat (light, with cooldown)
    const now = Date.now();
    const lastTime = lastMessageTime.get(message.author.id) || 0;
    if (now - lastTime > 60000) { // 1 minute cooldown
      const user = userData[message.author.id] || { 
        lastCheckin: null, streak: 0, totalCheckins: 0, 
        money: 0, xp: 0, lastLevel: 1, inventory: [], isSearchingJob: false 
      };
      user.xp += 10; // 10 XP per message with cooldown
      checkLevelUp(user, message);
      userData[message.author.id] = user;
      saveData();
      lastMessageTime.set(message.author.id, now);
    }

    handleCommands(message);
  });
}

// Khởi tạo handlers khi bot start
setupEventHandlers();

const dataFile = './userData.json';

// Load user data
let userData = {};
if (fs.existsSync(dataFile)) {
  userData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

// Save user data
function saveData() {
  fs.writeFileSync(dataFile, JSON.stringify(userData, null, 2));
}

// Banking functions
function createBankingProfile(userId) {
  if (!userData[userId].banking) {
    userData[userId].banking = {
      balance: 0,
      transactions: [],
      createdAt: new Date().toISOString(),
      lastInterestCheck: new Date().toISOString() // Thêm thời điểm check lãi cuối
    };
    saveData();
  }
  return userData[userId].banking;
}

function addTransaction(userId, type, amount, description, targetId = null) {
  if (!userData[userId].banking) createBankingProfile(userId);
  
  const transaction = {
    id: `T${Date.now()}${Math.floor(Math.random() * 1000)}`,
    type: type, // 'deposit', 'withdraw', 'transfer_in', 'transfer_out'
    amount: amount,
    description: description,
    targetId: targetId,
    timestamp: new Date().toISOString()
  };

  userData[userId].banking.transactions.push(transaction);
  
  // Giới hạn lịch sử giao dịch chỉ lưu 50 giao dịch gần nhất
  if (userData[userId].banking.transactions.length > 50) {
    userData[userId].banking.transactions = userData[userId].banking.transactions.slice(-50);
  }
  
  saveData();
  return transaction;
}

function formatTransactionHistory(transactions, userData) {
  let history = '';
  const recentTransactions = transactions.slice(-10).reverse(); // 10 giao dịch gần nhất
  
  for (const tx of recentTransactions) {
    const date = new Date(tx.timestamp).toLocaleString('vi-VN');
    let line = `[${date}] `;
    
    switch (tx.type) {
      case 'deposit':
        line += `📥 Nạp tiền: +${tx.amount.toLocaleString('vi-VN')} VND`;
        break;
      case 'withdraw':
        line += `📤 Rút tiền: -${tx.amount.toLocaleString('vi-VN')} VND`;
        break;
      case 'transfer_out':
        const targetName = tx.targetId ? `<@${tx.targetId}>` : 'Unknown';
        line += `💸 Chuyển cho ${targetName}: -${tx.amount.toLocaleString('vi-VN')} VND`;
        break;
      case 'transfer_in':
        const senderName = tx.targetId ? `<@${tx.targetId}>` : 'Unknown';
        line += `💰 Nhận từ ${senderName}: +${tx.amount.toLocaleString('vi-VN')} VND`;
        break;
    }
    
    if (tx.description) line += `\n💬 Ghi chú: ${tx.description}`;
    history += line + '\n\n';
  }
  
  return history || 'Chưa có giao dịch nào.';
}

const lastMessageTime = new Map();

function getLevelInfo(xp) {
  let level = 1;
  let required = 0;
  while (xp >= required + (level * 100 + (level - 1) * 50)) {
    required += level * 100 + (level - 1) * 50;
    level++;
    if (level > 1000) break; // Cap at 1000
  }
  const nextRequired = level * 100 + (level - 1) * 50;
  const nextXp = nextRequired - (xp - required);
  return { level: Math.min(level, 1000), nextXp };
}

// Hàm tính và cộng lãi ngân hàng
function calculateBankInterest(userId) {
  const user = userData[userId];
  if (!user || !user.banking || user.banking.balance <= 0) return { interest: 0, timeUntilNext: 0 };

  const now = new Date();
  const lastCheck = new Date(user.banking.lastInterestCheck);
  const minutesPassed = Math.floor((now - lastCheck) / (1000 * 60));
  
  if (minutesPassed >= 5) { // Check mỗi 5 phút
    const periods = Math.floor(minutesPassed / 5); // Số lần tính lãi
    const interestRate = 0.0002; // 0.02%
    const interest = Math.floor(user.banking.balance * interestRate * periods);
    
    if (interest > 0) {
      user.banking.balance += interest;
      user.banking.lastInterestCheck = now.toISOString();
      
      // Thêm giao dịch lãi
      addTransaction(userId, 'deposit', interest, 'Lãi suất ngân hàng');
      saveData();
    }
    
    // Trả về thông tin lãi và thời gian chờ
    return {
      interest: interest,
      timeUntilNext: 5 // Luôn là 5 phút sau khi nhận lãi
    };
  }
  
  // Trả về thông tin thời gian chờ nếu chưa đủ 5 phút
  const timeUntilNext = 5 - (minutesPassed % 5);
  return {
    interest: 0,
    timeUntilNext: timeUntilNext
  };
}

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

// Items có độ hiếm (dành cho hộp quà, event,...)
const rareItems = {
  basic: [
    { id: 'B1', name: 'Áo thun limited', sellPrice: 5000 },
    { id: 'B2', name: 'Quần jean rách', sellPrice: 10000 },
    { id: 'B3', name: 'Giày thể thao special', sellPrice: 15000 },
    { id: 'B4', name: 'Áo khoác phiên bản giới hạn', sellPrice: 20000 },
  ],
  accessory: [
    { id: 'A1', name: 'Vòng tay pha lê', sellPrice: 30000 },
    { id: 'A2', name: 'Nhẫn bạc đặc biệt', sellPrice: 50000 },
    { id: 'A3', name: 'Kính râm thời thượng', sellPrice: 40000 },
    { id: 'A4', name: 'Dây chuyền kim cương', sellPrice: 45000 },
  ],
  ultra: [
    { id: 'U1', name: 'Set đồ cao cấp', sellPrice: 100000 },
    { id: 'U2', name: 'Mũ hiệu ứng', sellPrice: 80000 },
    { id: 'U3', name: 'Túi xách branded', sellPrice: 120000 },
  ],
  ultra_rare: [
    { id: 'UR1', name: 'Set trang phục limited', sellPrice: 200000 },
    { id: 'UR2', name: 'Trang phục legendary', sellPrice: 250000 },
    { id: 'UR3', name: 'Set phụ kiện quý phái', sellPrice: 180000 },
  ],
  super_ultra_rare: [
    { id: 'SUR1', name: 'Trang phục thần thoại', sellPrice: 5000000 },
    { id: 'SUR2', name: 'Set đồ huyền bí', sellPrice: 6000000 },
    { id: 'SUR3', name: 'Phụ kiện vô giá', sellPrice: 7000000 },
    { id: 'SUR4', name: 'Áo choàng siêu cấp', sellPrice: 8000000 },
  ],
  ssur: [
    { id: 'SSUR1', name: 'Set trang phục tối thượng', sellPrice: 20000000 },
    { id: 'SSUR2', name: 'Trang phục thần linh', sellPrice: 24000000 },
    { id: 'SSUR3', name: 'Set phụ kiện huyền thoại', sellPrice: 28000000 },
    { id: 'SSUR4', name: 'Áo choàng vĩnh cửu', sellPrice: 32000000 },
  ],
};

// Shop items (không có độ hiếm)
// Shop items

const shopItems = {
  fashion: [
    // Đồ bình dân (Chợ - CH)
    { id: 'FASHION_CH1', displayId: '#CH1', name: 'Áo thun chợ', price: 50000, brand: 'Chợ', type: 'Áo', tier: 'Bình dân' },
    { id: 'FASHION_CH2', displayId: '#CH2', name: 'Quần jean chợ', price: 100000, brand: 'Chợ', type: 'Quần', tier: 'Bình dân' },
    { id: 'FASHION_CH3', displayId: '#CH3', name: 'Giày dép chợ', price: 80000, brand: 'Chợ', type: 'Giày', tier: 'Bình dân' },
    
    // Local Brand bình dân (Local - LB)
    { id: 'FASHION_LB1', displayId: '#LB1', name: 'Áo thun Yame', price: 200000, brand: 'Yame', type: 'Áo', tier: 'Local Brand' },
    { id: 'FASHION_LB2', displayId: '#LB2', name: 'Quần jean Routine', price: 350000, brand: 'Routine', type: 'Quần', tier: 'Local Brand' },
    { id: 'FASHION_LB3', displayId: '#LB3', name: 'Giày Bitis Hunter', price: 500000, brand: 'Bitis', type: 'Giày', tier: 'Local Brand' },

    // Thương hiệu phổ thông (Basic - BS)
    { id: 'FASHION_BS1', displayId: '#BS1', name: 'Áo Uniqlo', price: 500000, brand: 'Uniqlo', type: 'Áo', tier: 'Phổ thông' },
    { id: 'FASHION_BS2', displayId: '#BS2', name: 'Quần H&M', price: 800000, brand: 'H&M', type: 'Quần', tier: 'Phổ thông' },
    { id: 'FASHION_BS3', displayId: '#BS3', name: 'Giày Adidas Neo', price: 1200000, brand: 'Adidas', type: 'Giày', tier: 'Phổ thông' },

    // Thương hiệu cao cấp (Premium - PR)
    { id: 'FASHION_PR1', displayId: '#PR1', name: 'Áo Polo Lacoste', price: 2500000, brand: 'Lacoste', type: 'Áo', tier: 'Cao cấp' },
    { id: 'FASHION_PR2', displayId: '#PR2', name: 'Quần Versace Jeans', price: 5000000, brand: 'Versace', type: 'Quần', tier: 'Cao cấp' },
    { id: 'FASHION_PR3', displayId: '#PR3', name: 'Giày Nike Air Max', price: 4000000, brand: 'Nike', type: 'Giày', tier: 'Cao cấp' },

    // Thương hiệu luxury (Luxury - LX)
    { id: 'FASHION_LX1', displayId: '#LX1', name: 'Áo Gucci Monogram', price: 15000000, brand: 'Gucci', type: 'Áo', tier: 'Luxury' },
    { id: 'FASHION_LX2', displayId: '#LX2', name: 'Quần Louis Vuitton', price: 20000000, brand: 'Louis Vuitton', type: 'Quần', tier: 'Luxury' },
    { id: 'FASHION_LX3', displayId: '#LX3', name: 'Giày Balenciaga Triple S', price: 25000000, brand: 'Balenciaga', type: 'Giày', tier: 'Luxury' },

    // Phụ kiện bình dân (Accessory Basic - AB)
    { id: 'FASHION_AB1', displayId: '#AB1', name: 'Mũ lưỡi trai local brand', price: 150000, brand: 'Local', type: 'Phụ kiện', tier: 'Bình dân' },
    { id: 'FASHION_AB2', displayId: '#AB2', name: 'Túi đeo chéo Bitis', price: 300000, brand: 'Bitis', type: 'Phụ kiện', tier: 'Bình dân' },
    { id: 'FASHION_AB3', displayId: '#AB3', name: 'Kính mát Uniqlo', price: 400000, brand: 'Uniqlo', type: 'Phụ kiện', tier: 'Bình dân' },

    // Phụ kiện cao cấp (Accessory Premium - AP)
    { id: 'FASHION_AP1', displayId: '#AP1', name: 'Túi Coach', price: 8000000, brand: 'Coach', type: 'Phụ kiện', tier: 'Cao cấp' },
    { id: 'FASHION_AP2', displayId: '#AP2', name: 'Kính Ray-Ban', price: 5000000, brand: 'Ray-Ban', type: 'Phụ kiện', tier: 'Cao cấp' },
    { id: 'FASHION_AP3', displayId: '#AP3', name: 'Nón Gucci', price: 12000000, brand: 'Gucci', type: 'Phụ kiện', tier: 'Cao cấp' },

    // Phụ kiện luxury (Accessory Luxury - AL)
    { id: 'FASHION_AL1', displayId: '#AL1', name: 'Túi Hermes Birkin', price: 500000000, brand: 'Hermes', type: 'Phụ kiện', tier: 'Luxury' },
    { id: 'FASHION_AL2', displayId: '#AL2', name: 'Kính Cartier Diamond', price: 200000000, brand: 'Cartier', type: 'Phụ kiện', tier: 'Luxury' },
    { id: 'FASHION_AL3', displayId: '#AL3', name: 'Đồng hồ Rolex Daytona', price: 1000000000, brand: 'Rolex', type: 'Phụ kiện', tier: 'Luxury' }
  ],
  pets: [
    // Rank C - Thú cưng phổ thông
    { id: 'PET_1', displayId: '#TC1', name: 'Mèo Anh lông ngắn', price: 4000000, type: 'Mèo', food: 'Cá, thức ăn mèo', rarity: 'C' },
    { id: 'PET_2', displayId: '#TC2', name: 'Chó Corgi', price: 8000000, type: 'Chó', food: 'Thức ăn chó, thịt', rarity: 'C' },
    { id: 'PET_3', displayId: '#TC3', name: 'Vẹt Nam Mỹ', price: 5000000, type: 'Chim', food: 'Hạt, trái cây', rarity: 'C' },

    // Rank B - Thú cưng đặc biệt
    { id: 'PET_4', displayId: '#TB1', name: 'Mèo Scottish Fold', price: 15000000, type: 'Mèo', food: 'Cá, thức ăn mèo cao cấp', rarity: 'B' },
    { id: 'PET_5', displayId: '#TB2', name: 'Chó Husky Siberian', price: 20000000, type: 'Chó', food: 'Thức ăn chó cao cấp, thịt', rarity: 'B' },
    { id: 'PET_6', displayId: '#TB3', name: 'Vẹt Macaw Xanh-Vàng', price: 25000000, type: 'Chim', food: 'Hạt cao cấp, trái cây', rarity: 'B' },

    // Rank A - Thú cưng hiếm
    { id: 'PET_7', displayId: '#TA1', name: 'Mèo Sphynx không lông', price: 40000000, type: 'Mèo', food: 'Thực phẩm đặc chế cho mèo Sphynx', rarity: 'A' },
    { id: 'PET_8', displayId: '#TA2', name: 'Chó Poodle Teacup', price: 50000000, type: 'Chó', food: 'Thức ăn cao cấp đặc chế', rarity: 'A' },
    { id: 'PET_9', displayId: '#TA3', name: 'Vẹt African Grey', price: 45000000, type: 'Chim', food: 'Thức ăn nhập khẩu đặc biệt', rarity: 'A' },

    // Rank S - Thú cưng quý hiếm
    { id: 'PET_10', displayId: '#TS1', name: 'Mèo Bengal Exotic', price: 100000000, type: 'Mèo', food: 'Thực phẩm cao cấp đặc chế', rarity: 'S' },
    { id: 'PET_11', displayId: '#TS2', name: 'Chó Samoyed Trắng Tinh', price: 120000000, type: 'Chó', food: 'Thức ăn cao cấp nhập khẩu', rarity: 'S' },
    { id: 'PET_12', displayId: '#TS3', name: 'Vẹt Hyacinth Macaw', price: 150000000, type: 'Chim', food: 'Thức ăn đặc chế cao cấp', rarity: 'S' },

    // Rank SS - Thú cưng cực hiếm
    { id: 'PET_13', displayId: '#TSS1', name: 'Mèo Maine Coon Khổng Lồ', price: 200000000, type: 'Mèo', food: 'Thực phẩm siêu cao cấp đặc chế', rarity: 'SS' },
    { id: 'PET_14', displayId: '#TSS2', name: 'Chó Alaskan Malamute Thuần Chủng', price: 250000000, type: 'Chó', food: 'Thức ăn siêu cao cấp đặc chế', rarity: 'SS' },
    { id: 'PET_15', displayId: '#TSS3', name: 'Vẹt Scarlet Macaw Đột Biến', price: 300000000, type: 'Chim', food: 'Thức ăn siêu cao cấp nhập khẩu', rarity: 'SS' },

    // Rank SSS - Thú cưng siêu hiếm
    { id: 'PET_16', displayId: '#TSSS1', name: 'Mèo Savannah F1', price: 400000000, type: 'Mèo', food: 'Thực phẩm siêu cao cấp nhập khẩu', rarity: 'SSS' },
    { id: 'PET_17', displayId: '#TSSS2', name: 'Chó Tibetan Mastiff Thuần Chủng', price: 500000000, type: 'Chó', food: 'Thức ăn siêu cao cấp nhập khẩu', rarity: 'SSS' },
    { id: 'PET_18', displayId: '#TSSS3', name: 'Vẹt Palm Cockatoo Đột Biến', price: 550000000, type: 'Chim', food: 'Thức ăn siêu cao cấp đặc biệt', rarity: 'SSS' },

    // Rank SSS+ - Thú cưng huyền thoại
    { id: 'PET_19', displayId: '#TSSS+1', name: 'Mèo Ashera Lai Đặc Biệt', price: 800000000, type: 'Mèo', food: 'Thực phẩm huyền thoại đặc chế', rarity: 'SSS+' },
    { id: 'PET_20', displayId: '#TSSS+2', name: 'Chó Tibetan Mastiff Bạch Tạng', price: 900000000, type: 'Chó', food: 'Thức ăn huyền thoại đặc chế', rarity: 'SSS+' },
    { id: 'PET_21', displayId: '#TSSS+3', name: 'Vẹt Spix Macaw Đột Biến', price: 1000000000, type: 'Chim', food: 'Thức ăn huyền thoại đặc biệt', rarity: 'SSS+' }
  ],
  vehicles: [
    // Phương tiện cơ bản
    { id: 'VEHICLE_1', displayId: '#CB1', name: 'Xe đạp', price: 2500000, type: 'Xe đạp', fuel: 'Không cần', tier: 'Cơ bản' },
    { id: 'VEHICLE_2', displayId: '#CB2', name: 'Xe máy 50cc', price: 7500000, type: 'Xe máy', fuel: 'Xăng', tier: 'Cơ bản' },
    { id: 'VEHICLE_3', displayId: '#CB3', name: 'Xe máy PCX', price: 15000000, type: 'Xe máy', fuel: 'Xăng', tier: 'Cơ bản' },

    // Xe điện cao cấp
    { id: 'VEHICLE_4', displayId: '#XD1', name: 'Xe hơi Vinfast VF5', price: 1000000000, type: 'Ô tô', fuel: 'Điện', tier: 'Cao cấp' },
    { id: 'VEHICLE_5', displayId: '#XD2', name: 'Xe hơi Vinfast VF8', price: 2000000000, type: 'Ô tô', fuel: 'Điện', tier: 'Cao cấp' },

    // Xe xăng cao cấp
    { id: 'VEHICLE_6', displayId: '#XX1', name: 'Mercedes C300', price: 3000000000, type: 'Ô tô', fuel: 'Xăng', tier: 'Cao cấp' },
    { id: 'VEHICLE_7', displayId: '#XX2', name: 'BMW 7 Series', price: 5000000000, type: 'Ô tô', fuel: 'Xăng', tier: 'Cao cấp' },

    // Phương tiện đặc biệt
    { id: 'VEHICLE_8', displayId: '#DB1', name: 'Du thuyền Sea Ray', price: 10000000000, type: 'Thuyền', fuel: 'Dầu', tier: 'Đặc biệt' },
    { id: 'VEHICLE_9', displayId: '#DB2', name: 'Máy bay riêng Cessna', price: 50000000000, type: 'Máy bay', fuel: 'Nhiên liệu máy bay', tier: 'Đặc biệt' }
  ]
};

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

const questions = [
  {
    question: "Con gì có 4 chân nhưng không chạy?",
    options: ["Bàn", "Ghế", "Cửa"],
    correct: 0
  },
  {
    question: "Cái gì mà đi thì nằm, đứng thì bay?",
    options: ["Đồng hồ", "Máy bay", "Cầu thang"],
    correct: 0
  },
  {
    question: "Loại quả nào có nhiều vitamin C nhất?",
    options: ["Cam", "Táo", "Chuối"],
    correct: 0
  },
  {
    question: "Con vật nào có cổ dài nhất?",
    options: ["Hươu cao cổ", "Ngựa", "Voi"],
    correct: 0
  },
  {
    question: "Cái gì có mắt nhưng không nhìn thấy?",
    options: ["Kim mũi khâu", "Cây kim", "Bút chì"],
    correct: 0
  }
];

const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];

// Casino functions
function getCardValue(card) {
  if (card === 'A') return 11;
  if (['J', 'Q', 'K'].includes(card)) return 10;
  return parseInt(card);
}

function getHandValue(hand) {
  let value = 0;
  let aces = 0;
  for (let card of hand) {
    if (card === 'A') {
      aces++;
      value += 11;
    } else if (['J', 'Q', 'K'].includes(card)) {
      value += 10;
    } else {
      value += parseInt(card);
    }
  }
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return value;
}

function createDeck() {
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = [];
  for (let suit of suits) {
    for (let value of values) {
      deck.push(value + suit);
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function drawCard(deck, isDealer = false, isDealerFirstDraw = false, dealerFirstCard = null) {
  if (isDealer) {
    if (isDealerFirstDraw) {
      // 30% cơ hội nhà cái được A trong lá đầu tiên
      if (Math.random() < 0.3) {
        const aceCard = deck.find(card => card[0] === 'A');
        if (aceCard) {
          const index = deck.indexOf(aceCard);
          deck.splice(index, 1);
          return aceCard;
        }
      }
    } else if (dealerFirstCard && dealerFirstCard[0] === 'A') {
      // Nếu lá đầu là A, 40% cơ hội lá thứ 2 là 10, J, Q, K
      if (Math.random() < 0.4) {
        const tenCard = deck.find(card => ['10', 'J', 'Q', 'K'].includes(card[0]));
        if (tenCard) {
          const index = deck.indexOf(tenCard);
          deck.splice(index, 1);
          return tenCard;
        }
      }
    } else if (dealerFirstCard && ['10', 'J', 'Q', 'K'].includes(dealerFirstCard[0])) {
      // Nếu lá đầu là 10/J/Q/K, 40% cơ hội lá thứ 2 là A
      if (Math.random() < 0.4) {
        const aceCard = deck.find(card => card[0] === 'A');
        if (aceCard) {
          const index = deck.indexOf(aceCard);
          deck.splice(index, 1);
          return aceCard;
        }
      }
    } else if (Math.random() < 0.6) { // 60% cơ hội nhà cái được bài tốt cho các lần rút khác
      const lastFiveCards = deck.slice(-5);
      const highCard = lastFiveCards.find(card => ['J', 'Q', 'K', 'A'].includes(card[0]));
      if (highCard) {
        const index = deck.indexOf(highCard);
        deck.splice(index, 1);
        return highCard;
      }
    }
  }
  return deck.pop();
}

function getCardDisplay(card) {
  return `\`${card}\``;
}

const jobs = [
  { name: 'Designer', payPerHour: 50000, isCommission: false },
  { name: 'Coder', payPerHour: 80000, isCommission: false },
  { name: 'Shipper', payPerHour: 30000, isCommission: true },
  { name: 'Teacher', payPerHour: 60000, isCommission: false },
  { name: 'Doctor', payPerHour: 100000, isCommission: false },
  { name: 'Chef', payPerHour: 40000, isCommission: false },
  { name: 'Driver', payPerHour: 35000, isCommission: true },
  { name: 'Writer', payPerHour: 45000, isCommission: false },
];

// Handle process errors
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Login with status
console.log('Attempting to login...');
client.login(token)
    .then(() => {
        console.log('Login successful!');
    })
    .catch(error => {
        console.error('Login failed:', error);
    });

client.on('voiceStateUpdate', (oldState, newState) => {
  const userId = newState.id;
  const user = userData[userId] || { lastCheckin: null, streak: 0, totalCheckins: 0, money: 0, xp: 0, voiceJoinTime: null, lastLevel: 1, inventory: [], isSearchingJob: false };

  if (!oldState.channel && newState.channel) {
    // Joined voice
    user.voiceJoinTime = Date.now();
  } else if (oldState.channel && !newState.channel) {
    // Left voice
    if (user.voiceJoinTime) {
      const timeInVoice = Date.now() - user.voiceJoinTime;
      const xpGain = Math.floor(timeInVoice / 60000) * 20; // 20 XP per minute in voice
      user.xp += xpGain;
      user.voiceJoinTime = null;
      // Optional: notify user
    }
  }

  userData[userId] = user;
  saveData();
});

// Xóa tất cả listeners cũ để tránh trùng lặp
client.removeAllListeners();

// Thiết lập sự kiện ready một lần
client.once('clientReady', () => {
  console.log('Bot đã sẵn sàng!');
});

// Thiết lập sự kiện voiceStateUpdate một lần
client.on('voiceStateUpdate', (oldState, newState) => {
  const userId = newState.id;
  const user = userData[userId] || { lastCheckin: null, streak: 0, totalCheckins: 0, money: 0, xp: 0, voiceJoinTime: null, lastLevel: 1, inventory: [], isSearchingJob: false };

  if (!oldState.channel && newState.channel) {
    // Joined voice
    user.voiceJoinTime = Date.now();
  } else if (oldState.channel && !newState.channel) {
    // Left voice
    if (user.voiceJoinTime) {
      const timeInVoice = Date.now() - user.voiceJoinTime;
      const xpGain = Math.floor(timeInVoice / 60000) * 20; // 20 XP per minute
      user.xp += xpGain;
      user.voiceJoinTime = null;
    }
  }

  userData[userId] = user;
  saveData();
});

// Thiết lập sự kiện messageCreate một lần
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // XP for chat (light, with cooldown)
  const now = Date.now();
  const lastTime = lastMessageTime.get(message.author.id) || 0;
  if (now - lastTime > 60000) { // 1 minute cooldown
    const user = userData[message.author.id] || { lastCheckin: null, streak: 0, totalCheckins: 0, money: 0, xp: 0, lastLevel: 1, inventory: [], isSearchingJob: false };
    user.xp += 10; // 10 XP per message with cooldown
    checkLevelUp(user, message);
    userData[message.author.id] = user;
    saveData();
    lastMessageTime.set(message.author.id, now);
  }

  if (message.content === '!ping') {
    message.reply('Pong!');
  }

  if (message.content === '!help') {
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

    message.reply({ embeds: [helpEmbed] });
  }

  if (message.content === '!checkin') {
    const commandNow = Date.now();
    const cooldownTime = 2000; // 2 seconds
    if (commandCooldown.has(message.author.id)) {
      const lastUsed = commandCooldown.get(message.author.id);
      if (commandNow - lastUsed < cooldownTime) {
        return message.reply('Vui lòng chờ một chút trước khi dùng lệnh này lại.');
      }
    }
    commandCooldown.set(message.author.id, commandNow);

    const userId = message.author.id;
    const guild = message.guild;
    const member = guild.members.cache.get(userId);

    if (!member) {
      return message.reply('Không tìm thấy thành viên!');
    }

    // Bỏ check online status, cho phép tất cả trạng thái

    const now = new Date();
    const today = now.toDateString();
    const user = userData[userId] || { lastCheckin: null, streak: 0, totalCheckins: 0, money: 0, xp: 0, lastLevel: 1, inventory: [], isSearchingJob: false };

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
    saveData();

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

    message.reply({ embeds: [embed] });
  }

  if (message.content === '!profile') {
    const commandNow = Date.now();
    const cooldownTime = 5000; // 5 seconds
    if (commandCooldown.has(message.author.id)) {
      const lastUsed = commandCooldown.get(message.author.id);
      if (commandNow - lastUsed < cooldownTime) {
        return message.reply('Vui lòng chờ một chút trước khi dùng lệnh này lại.');
      }
    }
    commandCooldown.set(message.author.id, commandNow);

    console.log('Profile command used by', message.author.username);
    const userId = message.author.id;
    const user = userData[userId] || { lastCheckin: null, streak: 0, totalCheckins: 0, money: 0, xp: 0, lastLevel: 1, inventory: [], isSearchingJob: false };

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

    message.reply({ embeds: [embed] });
  }

  if (message.content === '!inventory') {
    const commandNow = Date.now();
    const cooldownTime = 2000; // 2 seconds
    if (commandCooldown.has(message.author.id)) {
      const lastUsed = commandCooldown.get(message.author.id);
      if (commandNow - lastUsed < cooldownTime) {
        return message.reply('Vui lòng chờ một chút trước khi dùng lệnh này lại.');
      }
    }
    commandCooldown.set(message.author.id, commandNow);

    const user = userData[message.author.id] || { inventory: [], isSearchingJob: false };
    if (!user.inventory || user.inventory.length === 0) {
      message.reply('Túi đồ trống!');
      return;
    }
    let desc = '';
    user.inventory.forEach((item, index) => {
      desc += `${index + 1}. ${item.name} - Bán: ${item.sellPrice.toLocaleString('vi-VN')} VND\n`;
    });
    const embed = new EmbedBuilder()
      .setTitle(`Túi đồ của ${message.author.username}`)
      .setDescription(desc)
      .setColor('#FFA500');
    message.reply({ embeds: [embed] });
  }

  if (message.content.startsWith('!sell ')) {
    const commandNow = Date.now();
    const cooldownTime = 2000; // 2 seconds
    if (commandCooldown.has(message.author.id)) {
      const lastUsed = commandCooldown.get(message.author.id);
      if (commandNow - lastUsed < cooldownTime) {
        return message.reply('Vui lòng chờ một chút trước khi dùng lệnh này lại.');
      }
    }
    commandCooldown.set(message.author.id, commandNow);

    const args = message.content.split(' ');
    const index = parseInt(args[1]) - 1;
    const user = userData[message.author.id] || { inventory: [], money: 0, isSearchingJob: false };
    if (!user.inventory || index < 0 || index >= user.inventory.length) {
      message.reply('Item không tồn tại!');
      return;
    }
    const item = user.inventory.splice(index, 1)[0];
    user.money += item.sellPrice;
    userData[message.author.id] = user;
    saveData();
    message.reply(`Đã bán ${item.name} cho ${item.sellPrice.toLocaleString('vi-VN')} VND. Tổng tiền: ${user.money.toLocaleString('vi-VN')} VND.`);
  }

  if (message.content.startsWith('!resetdata')) {
    const now = Date.now();
    const cooldownTime = 30000; // 30 seconds
    if (commandCooldown.has(message.author.id)) {
      const lastUsed = commandCooldown.get(message.author.id);
      if (now - lastUsed < cooldownTime) {
        return message.reply('Vui lòng chờ một chút trước khi dùng lệnh này lại.');
      }
    }
    commandCooldown.set(message.author.id, now);

    // if (message.author.id !== ownerId) {
    //   return message.reply('Chỉ owner mới có thể dùng lệnh này!');
    // }

    const args = message.content.split(' ');
    const targetUserId = args[1] || message.author.id; // Nếu không chỉ định, reset chính mình

    if (message.author.id !== ownerId && targetUserId !== message.author.id) {
      return message.reply('Bạn chỉ có thể reset data của chính mình!');
    }

    if (userData[targetUserId]) {
      delete userData[targetUserId];
      saveData();
      // Reset only certain maps, keep cooldown to prevent spam
      profileProcessing.delete(targetUserId);
      lastMessageTime.delete(targetUserId);
      return message.reply(`Đã reset data của user ${targetUserId}.`);
    } else {
      return message.reply('User chưa có data.');
    }
  }

  if (message.content === '!timviec') {
    const commandNow = Date.now();
    const cooldownTime = 2000; // 2 seconds
    if (commandCooldown.has(message.author.id)) {
      const lastUsed = commandCooldown.get(message.author.id);
      if (commandNow - lastUsed < cooldownTime) {
        return message.reply('Vui lòng chờ một chút trước khi dùng lệnh này lại.');
      }
    }
    commandCooldown.set(message.author.id, commandNow);

  const userId = message.author.id;

  const user = userData[userId] || {
    lastCheckin: null, streak: 0, totalCheckins: 0,
    money: 0, xp: 0, lastLevel: 1, inventory: [],
    lastWork: null, selectedJob: null, attemptsToday: 0, isSearchingJob: false
  };

  if (user.isSearchingJob) {
    return message.reply('Bạn đang trong quá trình thử việc, vui lòng hoàn thành trước khi tìm việc mới.');
  }

  try {

    const now = new Date();
    const today = now.toDateString();

    if (user.lastWork !== today) {
      user.attemptsToday = 0;
      user.selectedJob = null;
      user.lastWork = today;
    }

    if (user.selectedJob)
      return message.reply('✅ Bạn đã có nghề rồi! Dùng !work để làm việc.');
    if (user.attemptsToday >= 3)
      return message.reply('🚫 Bạn đã thử việc 3 lần hôm nay, hãy quay lại vào ngày mai.');

    // Tạo embed danh sách nghề
    let desc = 'Chọn nghề của bạn bằng cách react emoji:\n\n';
    jobs.forEach((job, index) => {
      desc += `${numberEmojis[index]} **${job.name}** — 💰 ${job.payPerHour.toLocaleString('vi-VN')} VND/giờ\n`;
    });

    const embed = new EmbedBuilder()
      .setTitle('🏢 TRUNG TÂM GIỚI THIỆU VIỆC LÀM')
      .setDescription(desc)
      .setColor('#FFA500');

    const jobMsg = await message.reply({ embeds: [embed] });
    for (let i = 0; i < jobs.length; i++) {
      await jobMsg.react(numberEmojis[i]);
    }

    user.isSearchingJob = true;
    userData[userId] = user;
    saveData();

    // Collector không giới hạn thời gian
    const filter = (reaction, userReact) =>
      numberEmojis.includes(reaction.emoji.name) && userReact.id === userId;

    const collector = jobMsg.createReactionCollector({ filter, max: 1, time: 60000 }); // 1 minute timeout

    collector.on('collect', async (reaction) => {
      try {
        const choice = numberEmojis.indexOf(reaction.emoji.name);
        const job = jobs[choice];

        await jobMsg.reactions.removeAll().catch(() => {});

        // Câu hỏi thử việc
        const question = questions[Math.floor(Math.random() * questions.length)];
        let qDesc = `${question.question}\n\n`;
        question.options.forEach((opt, idx) => {
          qDesc += `${numberEmojis[idx]} ${opt}\n`;
        });

        const qEmbed = new EmbedBuilder()
          .setTitle('🧠 THỬ VIỆC')
          .setDescription(qDesc)
          .setColor('#FFA500');

        const qMsg = await message.reply({ embeds: [qEmbed] });
        for (let i = 0; i < question.options.length; i++) {
          await qMsg.react(numberEmojis[i]);
        }

        const qFilter = (reaction, userReact) =>
          numberEmojis.slice(0, question.options.length).includes(reaction.emoji.name) &&
          userReact.id === userId;

        const qCollector = qMsg.createReactionCollector({ filter: qFilter, max: 1 });

        qCollector.on('collect', async (ansReaction) => {
          const answer = numberEmojis.indexOf(ansReaction.emoji.name);

          await qMsg.reactions.removeAll().catch(() => {});

          if (answer !== question.correct) {
            user.attemptsToday += 1;
            user.isSearchingJob = false;
            userData[userId] = user;
            saveData();
            return message.reply(`❌ Trả lời sai! Bạn còn ${3 - user.attemptsToday} lần thử hôm nay.`);
          }

          // Trả lời đúng
          user.selectedJob = job.name;
          user.attemptsToday = 0;
          user.lastWork = null; // Reset để cho phép work ngay sau khi tìm việc thành công
          user.isSearchingJob = false;
          userData[userId] = user;
          saveData();

          return message.reply(`🎉 Chúc mừng! Bạn đã được nhận làm **${job.name}**!\nDùng lệnh **!work** để bắt đầu làm việc.`);
        });

      } catch (err) {
        console.error(err);
        message.reply('⚠️ Lỗi khi xử lý quá trình chọn nghề.');
        user.isSearchingJob = false;
        userData[userId] = user;
        saveData();
      }
    });

    collector.on('end', () => {
      user.isSearchingJob = false;
      userData[userId] = user;
      saveData();
    });

  } catch (err) {
    console.error(err);
    message.reply('⚠️ Có lỗi xảy ra.');
    user.isSearchingJob = false;
    userData[userId] = user;
    saveData();
  }
}

  if (message.content === '!work') {
    const commandNow = Date.now();
    const cooldownTime = 2000; // 2 seconds
    if (commandCooldown.has(message.author.id)) {
      const lastUsed = commandCooldown.get(message.author.id);
      if (commandNow - lastUsed < cooldownTime) {
        return message.reply('Vui lòng chờ một chút trước khi dùng lệnh này lại.');
      }
    }
    commandCooldown.set(message.author.id, commandNow);

    const userId = message.author.id;
    const user = userData[userId] || { 
      lastCheckin: null, 
      streak: 0, 
      totalCheckins: 0, 
      money: 0, 
      xp: 0, 
      lastLevel: 1, 
      inventory: [], 
      lastWork: null,
      lastOvertimeWork: null, 
      selectedJob: null, 
      attemptsToday: 0, 
      isSearchingJob: false,
      overtimeCount: 0 // Số lần đã làm ngoài giờ trong ngày
    };

    const now = new Date();
    const today = now.toDateString();

    if (!user.selectedJob) {
      return message.reply('Bạn chưa chọn nghề! Dùng !timviec để tìm việc trước.');
    }

    const job = jobs.find(j => j.name === user.selectedJob);
    if (!job) {
      return message.reply('Lỗi: Nghề không tồn tại.');
    }

    // Kiểm tra và thực hiện công việc chính
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
      userData[userId] = user;
      saveData();

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

      return message.reply({ embeds: [workEmbed] });
    }
    
    // Xử lý làm ngoài giờ (chỉ hiển thị sau khi đã làm việc chính)
    const maxOvertimePerDay = 3; // Tối đa 3 lần làm ngoài giờ một ngày
    if (user.overtimeCount >= maxOvertimePerDay) {
      return message.reply('❌ Bạn đã làm đủ số giờ ngoài giờ cho phép hôm nay (tối đa 3 lần).');
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
    userData[userId] = user;
    saveData();

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

    message.reply({ embeds: [overtimeEmbed] });
  }

  // Casino commands
  const casino = require('./src/commands/casino.js');

  // BA CÂY
  if (message.content.startsWith('!bacay')) {
    const commandNow = Date.now();
    const cooldownTime = 3000;
    if (commandCooldown.has(message.author.id)) {
      const lastUsed = commandCooldown.get(message.author.id);
      if (commandNow - lastUsed < cooldownTime) {
        return message.reply('Vui lòng chờ một chút trước khi dùng lệnh này lại.');
      }
    }
    commandCooldown.set(message.author.id, commandNow);

    const userId = message.author.id;
    const user = userData[userId] || { money: 0, isSearchingJob: false };

    const args = message.content.split(' ');
    let betAmount;

    if (args[1] === 'all') {
      betAmount = user.money;
    } else {
      betAmount = parseInt(args[1]);
    }

    if (!betAmount || betAmount <= 0) {
      return message.reply('Cú pháp: `!bacay <số tiền>` hoặc `!bacay all`\nVí dụ: `!bacay 10000`');
    }

    if (user.money < betAmount) {
      return message.reply(`Bạn không đủ tiền! Bạn chỉ có ${user.money.toLocaleString('vi-VN')} VND.`);
    }

    await casino.handleBaCay(message, betAmount, user, () => {
      userData[userId] = user;
      saveData();
    });
  }

  // XÌ DÁCH/BLACKJACK
  if (message.content.startsWith('!xidach') || message.content.startsWith('!blackjack')) {
    const commandNow = Date.now();
    const cooldownTime = 3000;
    if (commandCooldown.has(message.author.id)) {
      const lastUsed = commandCooldown.get(message.author.id);
      if (commandNow - lastUsed < cooldownTime) {
        return message.reply('Vui lòng chờ một chút trước khi dùng lệnh này lại.');
      }
    }
    commandCooldown.set(message.author.id, commandNow);

    const userId = message.author.id;
    const user = userData[userId] || { money: 0, isSearchingJob: false };

    const args = message.content.split(' ');
    let betAmount;

    if (args[1] === 'all') {
      betAmount = user.money;
    } else {
      betAmount = parseInt(args[1]);
    }

    if (!betAmount || betAmount <= 0) {
      return message.reply('Cú pháp: `!xidach <số tiền>` hoặc `!xidach all`\nVí dụ: `!xidach 10000`');
    }

    if (user.money < betAmount) {
      return message.reply(`Bạn không đủ tiền! Bạn chỉ có ${user.money.toLocaleString('vi-VN')} VND.`);
    }

    await casino.handleBlackjack(message, betAmount, user, () => {
      userData[userId] = user;
      saveData();
    });
  }

  // TUNG XU - MẶT NGỬA/SẤP
  if (message.content.startsWith('!ngua') || message.content.startsWith('!sap')) {
    const commandNow = Date.now();
    const cooldownTime = 3000;
    if (commandCooldown.has(message.author.id)) {
      const lastUsed = commandCooldown.get(message.author.id);
      if (commandNow - lastUsed < cooldownTime) {
        return message.reply('Vui lòng chờ một chút trước khi dùng lệnh này lại.');
      }
    }
    commandCooldown.set(message.author.id, commandNow);

    const isNgua = message.content.startsWith('!ngua');
    const userId = message.author.id;
    const user = userData[userId] || { money: 0, isSearchingJob: false };

    const args = message.content.split(' ');
    let betAmount;

    if (args[1] === 'all') {
      betAmount = user.money;
    } else {
      betAmount = parseInt(args[1]);
    }

    if (!betAmount || betAmount <= 0) {
      return message.reply(`Cú pháp: \`!${isNgua ? 'ngua' : 'sap'} <số tiền>\` hoặc \`!${isNgua ? 'ngua' : 'sap'} all\`\nVí dụ: \`!${isNgua ? 'ngua' : 'sap'} 10000\``);
    }

    if (user.money < betAmount) {
      return message.reply(`Bạn không đủ tiền! Bạn chỉ có ${user.money.toLocaleString('vi-VN')} VND.`);
    }

    const playerChoice = isNgua ? '👑' : '🦅';
    casino.handleCoinFlip(message, betAmount, playerChoice, user, () => {
      userData[userId] = user;
      saveData();
    });
  }

  // SLOT MACHINE
  if (message.content.startsWith('!slot')) {
    const commandNow = Date.now();
    const cooldownTime = 3000;
    if (commandCooldown.has(message.author.id)) {
      const lastUsed = commandCooldown.get(message.author.id);
      if (commandNow - lastUsed < cooldownTime) {
        return message.reply('Vui lòng chờ một chút trước khi dùng lệnh này lại.');
      }
    }
    commandCooldown.set(message.author.id, commandNow);

    const userId = message.author.id;
    const user = userData[userId] || { money: 0, isSearchingJob: false };

    const args = message.content.split(' ');
    let betAmount;

    if (args[1] === 'all') {
      betAmount = user.money;
    } else {
      betAmount = parseInt(args[1]);
    }

    if (!betAmount || betAmount <= 0) {
      return message.reply('Cú pháp: `!slot <số tiền>` hoặc `!slot all`\nVí dụ: `!slot 10000`');
    }

    if (user.money < betAmount) {
      return message.reply(`Bạn không đủ tiền! Bạn chỉ có ${user.money.toLocaleString('vi-VN')} VND.`);
    }

    const isOwner = message.author.id === ownerId;
    casino.handleSlot(message, betAmount, user, () => {
      userData[userId] = user;
      saveData();
    }, isOwner);
  }

  // OWNER COMMANDS
  // Set Money
  if (message.content.startsWith('!setmoney')) {
    console.log(`Command user ID: ${message.author.id}, Owner ID: ${ownerId}, Match: ${message.author.id === ownerId}`);
    if (message.author.id !== ownerId) {
      return message.reply(`❌ Chỉ owner mới có thể dùng lệnh này!\nYour ID: ${message.author.id}\nOwner ID: ${ownerId}`);
    }

    const args = message.content.split(' ');
    if (args.length < 3) {
      return message.reply('Cú pháp: `!setmoney <@user hoặc userID> <số tiền>`\nVí dụ: `!setmoney @user 1000000`');
    }

    const targetUserId = args[1].replace(/[<@!>]/g, '');
    const amount = parseInt(args[2]);

    if (!amount || amount < 0) {
      return message.reply('Số tiền phải là số dương!');
    }

    const targetUser = userData[targetUserId] || { 
      lastCheckin: null, streak: 0, totalCheckins: 0, 
      money: 0, xp: 0, lastLevel: 1, inventory: [], 
      lastWork: null, selectedJob: null, attemptsToday: 0, isSearchingJob: false 
    };

    targetUser.money = amount;
    userData[targetUserId] = targetUser;
    saveData();

    message.reply(`✅ Đã set tiền cho <@${targetUserId}> thành ${amount.toLocaleString('vi-VN')} VND`);
  }

  // Add Money
  if (message.content.startsWith('!addmoney')) {
    if (message.author.id !== ownerId) {
      return message.reply('❌ Chỉ owner mới có thể dùng lệnh này!');
    }

    const args = message.content.split(' ');
    if (args.length < 3) {
      return message.reply('Cú pháp: `!addmoney <@user hoặc userID> <số tiền>`\nVí dụ: `!addmoney @user 500000`');
    }

    const targetUserId = args[1].replace(/[<@!>]/g, '');
    const amount = parseInt(args[2]);

    if (!amount) {
      return message.reply('Số tiền không hợp lệ!');
    }

    const targetUser = userData[targetUserId] || { 
      lastCheckin: null, streak: 0, totalCheckins: 0, 
      money: 0, xp: 0, lastLevel: 1, inventory: [], 
      lastWork: null, selectedJob: null, attemptsToday: 0, isSearchingJob: false 
    };

    targetUser.money += amount;
    userData[targetUserId] = targetUser;
    saveData();

    message.reply(`✅ Đã ${amount >= 0 ? 'thêm' : 'trừ'} ${Math.abs(amount).toLocaleString('vi-VN')} VND cho <@${targetUserId}>\n💰 Tổng tiền hiện tại: ${targetUser.money.toLocaleString('vi-VN')} VND`);
  }

  // Set Level
  if (message.content.startsWith('!setlevel')) {
    if (message.author.id !== ownerId) {
      return message.reply('❌ Chỉ owner mới có thể dùng lệnh này!');
    }

    const args = message.content.split(' ');
    if (args.length < 3) {
      return message.reply('Cú pháp: `!setlevel <@user hoặc userID> <level>`\nVí dụ: `!setlevel @user 50`');
    }

    const targetUserId = args[1].replace(/[<@!>]/g, '');
    const level = parseInt(args[2]);

    if (!level || level < 1 || level > 1000) {
      return message.reply('Level phải từ 1 đến 1000!');
    }

    const targetUser = userData[targetUserId] || { 
      lastCheckin: null, streak: 0, totalCheckins: 0, 
      money: 0, xp: 0, lastLevel: 1, inventory: [], 
      lastWork: null, selectedJob: null, attemptsToday: 0, isSearchingJob: false 
    };

    // Calculate XP needed for target level
    let requiredXP = 0;
    for (let i = 1; i < level; i++) {
      requiredXP += i * 100 + (i - 1) * 50;
    }

    targetUser.xp = requiredXP;
    targetUser.lastLevel = level;
    userData[targetUserId] = targetUser;
    saveData();

    message.reply(`✅ Đã set level cho <@${targetUserId}> thành ${level}\n📊 XP hiện tại: ${requiredXP}`);
  }

  // Add XP
  if (message.content.startsWith('!addxp')) {
    if (message.author.id !== ownerId) {
      return message.reply('❌ Chỉ owner mới có thể dùng lệnh này!');
    }

    const args = message.content.split(' ');
    if (args.length < 3) {
      return message.reply('Cú pháp: `!addxp <@user hoặc userID> <xp>`\nVí dụ: `!addxp @user 1000`');
    }

    const targetUserId = args[1].replace(/[<@!>]/g, '');
    const xp = parseInt(args[2]);

    if (!xp) {
      return message.reply('XP không hợp lệ!');
    }

    const targetUser = userData[targetUserId] || { 
      lastCheckin: null, streak: 0, totalCheckins: 0, 
      money: 0, xp: 0, lastLevel: 1, inventory: [], 
      lastWork: null, selectedJob: null, attemptsToday: 0, isSearchingJob: false 
    };

    targetUser.xp += xp;
    if (targetUser.xp < 0) targetUser.xp = 0;

    const { level } = getLevelInfo(targetUser.xp);
    targetUser.lastLevel = level;

    userData[targetUserId] = targetUser;
    saveData();

    message.reply(`✅ Đã ${xp >= 0 ? 'thêm' : 'trừ'} ${Math.abs(xp)} XP cho <@${targetUserId}>\n📊 XP hiện tại: ${targetUser.xp}\n🏆 Level hiện tại: ${level}`);
  }

  // Give Item
  if (message.content.startsWith('!giveitem')) {
    if (message.author.id !== ownerId) {
      return message.reply('❌ Chỉ owner mới có thể dùng lệnh này!');
    }

    const args = message.content.split(' ');
    if (args.length < 3) {
      return message.reply('Cú pháp: `!giveitem <@user hoặc userID> <số lượng>`\nVí dụ: `!giveitem @user 5`');
    }

    const targetUserId = args[1].replace(/[<@!>]/g, '');
    const count = parseInt(args[2]) || 1;

    if (count < 1 || count > 50) {
      return message.reply('Số lượng phải từ 1 đến 50!');
    }

    const targetUser = userData[targetUserId] || { 
      lastCheckin: null, streak: 0, totalCheckins: 0, 
      money: 0, xp: 0, lastLevel: 1, inventory: [], 
      lastWork: null, selectedJob: null, attemptsToday: 0, isSearchingJob: false 
    };

    targetUser.inventory = targetUser.inventory || [];
    const receivedItems = [];

    for (let i = 0; i < count; i++) {
      const item = getRandomItem();
      targetUser.inventory.push(item);
      receivedItems.push(item.name);
    }

    userData[targetUserId] = targetUser;
    saveData();

    const itemList = receivedItems.join(', ');
    message.reply(`✅ Đã tặng ${count} item cho <@${targetUserId}>:\n🎁 ${itemList}`);
  }

  // Set Job
  if (message.content.startsWith('!setjob')) {
    if (message.author.id !== ownerId) {
      return message.reply('❌ Chỉ owner mới có thể dùng lệnh này!');
    }

    const args = message.content.split(' ');
    if (args.length < 3) {
      const jobList = jobs.map((j, i) => `${i + 1}. ${j.name}`).join('\n');
      return message.reply(`Cú pháp: \`!setjob <@user hoặc userID> <tên job>\`\n\n**Danh sách job:**\n${jobList}\n\nVí dụ: \`!setjob @user Coder\``);
    }

    const targetUserId = args[1].replace(/[<@!>]/g, '');
    const jobName = args.slice(2).join(' ');

    const job = jobs.find(j => j.name.toLowerCase() === jobName.toLowerCase());
    if (!job) {
      const jobList = jobs.map(j => j.name).join(', ');
      return message.reply(`❌ Job không tồn tại!\n\n**Danh sách job:** ${jobList}`);
    }

    const targetUser = userData[targetUserId] || { 
      lastCheckin: null, streak: 0, totalCheckins: 0, 
      money: 0, xp: 0, lastLevel: 1, inventory: [], 
      lastWork: null, selectedJob: null, attemptsToday: 0, isSearchingJob: false 
    };

    targetUser.selectedJob = job.name;
    targetUser.attemptsToday = 0;
    targetUser.lastWork = null;
    userData[targetUserId] = targetUser;
    saveData();

    message.reply(`✅ Đã set job cho <@${targetUserId}> thành **${job.name}**\n💰 Lương: ${job.payPerHour.toLocaleString('vi-VN')} VND/giờ`);
  }

  // Give Money to All
  if (message.content.startsWith('!givemoneyall')) {
    if (message.author.id !== ownerId) {
      return message.reply('❌ Chỉ owner mới có thể dùng lệnh này!');
    }

    const args = message.content.split(' ');
    const amount = parseInt(args[1]);

    if (!amount || amount <= 0) {
      return message.reply('Cú pháp: `!givemoneyall <số tiền>`\nVí dụ: `!givemoneyall 100000`');
    }

    let count = 0;
    for (let userId in userData) {
      userData[userId].money += amount;
      count++;
    }

    saveData();
    message.reply(`✅ Đã tặng ${amount.toLocaleString('vi-VN')} VND cho tất cả ${count} người chơi!`);
  }

  // View User Data
  if (message.content.startsWith('!userdata')) {
    if (message.author.id !== ownerId) {
      return message.reply('❌ Chỉ owner mới có thể dùng lệnh này!');
    }

    const args = message.content.split(' ');
    if (args.length < 2) {
      return message.reply('Cú pháp: `!userdata <@user hoặc userID>`\nVí dụ: `!userdata @user`');
    }

    const targetUserId = args[1].replace(/[<@!>]/g, '');
    const targetUser = userData[targetUserId];

    if (!targetUser) {
      return message.reply('❌ User chưa có data!');
    }

    const { level } = getLevelInfo(targetUser.xp);
    
    const embed = new EmbedBuilder()
      .setTitle(`📊 Data của User ${targetUserId}`)
      .setColor('#0099FF')
      .addFields(
        { name: '💰 Tiền', value: `${targetUser.money.toLocaleString('vi-VN')} VND`, inline: true },
        { name: '📊 XP', value: `${targetUser.xp}`, inline: true },
        { name: '🏆 Level', value: `${level}`, inline: true },
        { name: '🔥 Streak', value: `${targetUser.streak || 0} ngày`, inline: true },
        { name: '📅 Tổng check-in', value: `${targetUser.totalCheckins || 0}`, inline: true },
        { name: '💼 Nghề nghiệp', value: targetUser.selectedJob || 'Chưa chọn', inline: true },
        { name: '🎒 Số item', value: `${targetUser.inventory?.length || 0}`, inline: true },
        { name: '🔍 isSearchingJob', value: `${targetUser.isSearchingJob ? 'Có' : 'Không'}`, inline: true },
        { name: '🎯 Lần thử việc hôm nay', value: `${targetUser.attemptsToday || 0}/3`, inline: true }
      );

    message.reply({ embeds: [embed] });
  }

  // Set Streak
  if (message.content.startsWith('!setstreak')) {
    if (message.author.id !== ownerId) {
      return message.reply('❌ Chỉ owner mới có thể dùng lệnh này!');
    }

    const args = message.content.split(' ');
    if (args.length < 3) {
      return message.reply('Cú pháp: `!setstreak <@user hoặc userID> <số ngày>`\nVí dụ: `!setstreak @user 7`');
    }

    const targetUserId = args[1].replace(/[<@!>]/g, '');
    const streak = parseInt(args[2]);

    if (!streak || streak < 0) {
      return message.reply('Số ngày streak phải là số dương!');
    }

    const targetUser = userData[targetUserId] || { 
      lastCheckin: null, streak: 0, totalCheckins: 0, 
      money: 0, xp: 0, lastLevel: 1, inventory: [], 
      lastWork: null, selectedJob: null, attemptsToday: 0, isSearchingJob: false 
    };

    targetUser.streak = streak;
    userData[targetUserId] = targetUser;
    saveData();

    message.reply(`✅ Đã set streak cho <@${targetUserId}> thành ${streak} ngày`);
  }

  // Reset All Data
  if (message.content === '!resetalldata') {
    if (message.author.id !== ownerId) {
      return message.reply('❌ Chỉ owner mới có thể dùng lệnh này!');
    }

    const confirmEmbed = new EmbedBuilder()
      .setTitle('⚠️ CẢNH BÁO: XÓA TẤT CẢ DỮ LIỆU')
      .setDescription('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu của tất cả người chơi?\nReact ✅ để xác nhận hoặc ❌ để hủy.')
      .setColor('#FF0000');

    const confirmMsg = await message.reply({ embeds: [confirmEmbed] });
    await confirmMsg.react('✅');
    await confirmMsg.react('❌');

    const filter = (reaction, user) => 
      ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;

    const collector = confirmMsg.createReactionCollector({ filter, time: 30000 });

    collector.on('collect', async (reaction) => {
      if (reaction.emoji.name === '✅') {
        userData = {};
        saveData();
        profileProcessing.clear();
        lastMessageTime.clear();
        commandCooldown.clear();
        await confirmMsg.reactions.removeAll();
        message.reply('✅ Đã xóa toàn bộ dữ liệu thành công!');
      } else {
        await confirmMsg.reactions.removeAll();
        message.reply('❌ Đã hủy lệnh xóa dữ liệu.');
      }
      collector.stop();
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time') {
        await confirmMsg.reactions.removeAll();
        message.reply('❌ Hết thời gian xác nhận, lệnh đã bị hủy.');
      }
    });
  }

  // Top Richest Players
  if (message.content === '!toprich') {
    const topPlayers = Object.entries(userData)
      .sort(([,a], [,b]) => b.money - a.money)
      .slice(0, 10);

    if (topPlayers.length === 0) {
      return message.reply('Chưa có dữ liệu người chơi!');
    }

    let desc = '';
    for (let i = 0; i < topPlayers.length; i++) {
      const [userId, user] = topPlayers[i];
      desc += `${i + 1}. <@${userId}> - ${user.money.toLocaleString('vi-VN')} VND\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle('💰 TOP 10 NGƯỜI GIÀU NHẤT')
      .setDescription(desc)
      .setColor('#FFD700')
      .setFooter({ text: 'Cập nhật theo thời gian thực' });

    message.reply({ embeds: [embed] });
  }

  // Top Level Players
  if (message.content === '!toplevel') {
    const topPlayers = Object.entries(userData)
      .map(([id, user]) => ({
        id,
        level: getLevelInfo(user.xp).level,
        xp: user.xp
      }))
      .sort((a, b) => b.level - a.level || b.xp - a.xp)
      .slice(0, 10);

    if (topPlayers.length === 0) {
      return message.reply('Chưa có dữ liệu người chơi!');
    }

    let desc = '';
    for (let i = 0; i < topPlayers.length; i++) {
      const player = topPlayers[i];
      desc += `${i + 1}. <@${player.id}> - Level ${player.level} (${player.xp} XP)\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle('🏆 TOP 10 LEVEL CAO NHẤT')
      .setDescription(desc)
      .setColor('#FF69B4')
      .setFooter({ text: 'Cập nhật theo thời gian thực' });

    message.reply({ embeds: [embed] });
  }

  // Find Rich Players
  if (message.content.startsWith('!findrich')) {
    if (message.author.id !== ownerId) {
      return message.reply('❌ Chỉ owner mới có thể dùng lệnh này!');
    }

    const args = message.content.split(' ');
    const minMoney = parseInt(args[1]) || 1000000; // Mặc định 1 triệu

    const richPlayers = Object.entries(userData)
      .filter(([,user]) => user.money >= minMoney)
      .sort(([,a], [,b]) => b.money - a.money);

    if (richPlayers.length === 0) {
      return message.reply(`Không tìm thấy người chơi có từ ${minMoney.toLocaleString('vi-VN')} VND trở lên!`);
    }

    let desc = `**Danh sách người chơi có từ ${minMoney.toLocaleString('vi-VN')} VND trở lên:**\n\n`;
    for (const [userId, user] of richPlayers) {
      desc += `<@${userId}> - ${user.money.toLocaleString('vi-VN')} VND\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle('🔍 TÌM NGƯỜI CHƠI GIÀU')
      .setDescription(desc)
      .setColor('#4169E1')
      .setFooter({ text: `Tìm thấy ${richPlayers.length} người chơi` });

    message.reply({ embeds: [embed] });
  }

  // Shop commands
  if (message.content === '!shop') {
    const embed = new EmbedBuilder()
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

    message.reply({ embeds: [embed] });
    return;
  }

  if (message.content.startsWith('!shop ')) {
    const category = message.content.split(' ')[1];
    if (!['fashion', 'pets', 'vehicles'].includes(category)) {
      return message.reply('Danh mục không hợp lệ! Sử dụng `!shop` để xem danh sách danh mục.');
    }

    const itemsList = getShopItemsList(category, false);
    const categoryTitles = {
      fashion: '👕 CỬA HÀNG THỜI TRANG',
      pets: '🐱 CỬA HÀNG THÚ CƯNG',
      vehicles: '🚗 CỬA HÀNG PHƯƠNG TIỆN'
    };

    const embed = new EmbedBuilder()
      .setTitle(categoryTitles[category])
      .setDescription(itemsList)
      .setColor('#FF69B4')
      .setFooter({ text: 'Sử dụng !buy <itemID> để mua vật phẩm' });

    message.reply({ embeds: [embed] });
    return;
  }

  // Banking Commands
  if (message.content === '!bank' || message.content === '!banking') {
    const userId = message.author.id;
    const user = userData[userId] || { 
      lastCheckin: null, streak: 0, totalCheckins: 0, 
      money: 0, xp: 0, lastLevel: 1, inventory: [], 
      lastWork: null, selectedJob: null, attemptsToday: 0, 
      isSearchingJob: false 
    };

    if (!user.banking) createBankingProfile(userId);
    
    // Tính lãi trước khi hiển thị
    const interestInfo = calculateBankInterest(userId);

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

    message.reply({ embeds: [embed] });
    return;
  }

  if (message.content.startsWith('!deposit ')) {
    const userId = message.author.id;
    const user = userData[userId] || { 
      lastCheckin: null, streak: 0, totalCheckins: 0, 
      money: 0, xp: 0, lastLevel: 1, inventory: [], 
      lastWork: null, selectedJob: null, attemptsToday: 0, 
      isSearchingJob: false 
    };

    if (!user.banking) createBankingProfile(userId);

    let amount;
    const amountArg = message.content.split(' ')[1];
    
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
    addTransaction(userId, 'deposit', amount, 'Nạp tiền vào tài khoản');
    saveData();

    const embed = new EmbedBuilder()
      .setTitle('📥 NẠP TIỀN THÀNH CÔNG')
      .addFields(
        { name: '💰 Số tiền nạp', value: `${amount.toLocaleString('vi-VN')} VND`, inline: true },
        { name: '💳 Số dư mới', value: `${user.banking.balance.toLocaleString('vi-VN')} VND`, inline: true },
        { name: '💵 Tiền mặt còn lại', value: `${user.money.toLocaleString('vi-VN')} VND`, inline: true }
      )
      .setColor('#00FF00');

    message.reply({ embeds: [embed] });
    return;
  }

  if (message.content.startsWith('!withdraw ')) {
    const userId = message.author.id;
    const user = userData[userId] || { 
      lastCheckin: null, streak: 0, totalCheckins: 0, 
      money: 0, xp: 0, lastLevel: 1, inventory: [], 
      lastWork: null, selectedJob: null, attemptsToday: 0, 
      isSearchingJob: false 
    };

    if (!user.banking) createBankingProfile(userId);

    let amount;
    const amountArg = message.content.split(' ')[1];
    
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
    addTransaction(userId, 'withdraw', amount, 'Rút tiền từ tài khoản');
    saveData();

    const embed = new EmbedBuilder()
      .setTitle('📤 RÚT TIỀN THÀNH CÔNG')
      .addFields(
        { name: '💰 Số tiền rút', value: `${amount.toLocaleString('vi-VN')} VND`, inline: true },
        { name: '💳 Số dư còn lại', value: `${user.banking.balance.toLocaleString('vi-VN')} VND`, inline: true },
        { name: '💵 Tiền mặt hiện có', value: `${user.money.toLocaleString('vi-VN')} VND`, inline: true }
      )
      .setColor('#00FF00');

    message.reply({ embeds: [embed] });
    return;
  }

  if (message.content.startsWith('!transfer ')) {
    const userId = message.author.id;
    const user = userData[userId] || { 
      lastCheckin: null, streak: 0, totalCheckins: 0, 
      money: 0, xp: 0, lastLevel: 1, inventory: [], 
      lastWork: null, selectedJob: null, attemptsToday: 0, 
      isSearchingJob: false 
    };

    if (!user.banking) createBankingProfile(userId);

    const args = message.content.split(' ');
    if (args.length < 3) {
      return message.reply('❌ Cú pháp: `!transfer <@user> <số tiền> [ghi chú]`');
    }

    const targetId = args[1].replace(/[<@!>]/g, '');
    if (targetId === userId) {
      return message.reply('❌ Bạn không thể chuyển tiền cho chính mình!');
    }

    let amount;
    if (args[2].toLowerCase() === 'all') {
      amount = user.banking.balance;
      if (amount <= 0) {
        return message.reply('❌ Số dư tài khoản của bạn là 0 VND!');
      }
    } else {
      amount = parseInt(args[2]);
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

    if (!targetUser.banking) createBankingProfile(targetId);

    const note = args.slice(3).join(' ') || 'Không có ghi chú';

    // Thực hiện chuyển tiền
    user.banking.balance -= amount;
    targetUser.banking.balance += amount;

    // Ghi transaction cho cả 2 bên
    addTransaction(userId, 'transfer_out', amount, note, targetId);
    addTransaction(targetId, 'transfer_in', amount, note, userId);
    
    saveData();

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

    return;
  }

  if (message.content === '!history') {
    const userId = message.author.id;
    const user = userData[userId] || { 
      lastCheckin: null, streak: 0, totalCheckins: 0, 
      money: 0, xp: 0, lastLevel: 1, inventory: [], 
      lastWork: null, selectedJob: null, attemptsToday: 0, 
      isSearchingJob: false 
    };

    if (!user.banking) createBankingProfile(userId);
    
    // Tính lãi trước khi hiển thị lịch sử
    calculateBankInterest(userId);

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

    message.reply({ embeds: [embed] });
    return;
  }

  if (message.content.startsWith('!buy ')) {
    const itemId = message.content.split(' ')[1].toUpperCase();
    const userId = message.author.id;
    const user = userData[userId] || { 
      lastCheckin: null, streak: 0, totalCheckins: 0, 
      money: 0, xp: 0, lastLevel: 1, inventory: [], 
      lastWork: null, selectedJob: null, attemptsToday: 0, 
      isSearchingJob: false 
    };

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
    saveData();

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

    message.reply({ embeds: [embed] });
    return;
  }

  // Server Stats
  if (message.content === '!serverstats') {
    if (message.author.id !== ownerId) {
      return message.reply('❌ Chỉ owner mới có thể dùng lệnh này!');
    }

    const totalPlayers = Object.keys(userData).length;
    const totalMoney = Object.values(userData).reduce((sum, user) => sum + user.money, 0);
    const avgMoney = totalPlayers > 0 ? Math.floor(totalMoney / totalPlayers) : 0;
    
    const totalXP = Object.values(userData).reduce((sum, user) => sum + user.xp, 0);
    const avgXP = totalPlayers > 0 ? Math.floor(totalXP / totalPlayers) : 0;

    const activeJobs = Object.values(userData)
      .filter(user => user.selectedJob)
      .reduce((acc, user) => {
        acc[user.selectedJob] = (acc[user.selectedJob] || 0) + 1;
        return acc;
      }, {});

    let jobStats = '';
    for (const [job, count] of Object.entries(activeJobs)) {
      jobStats += `${job}: ${count} người\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle('📊 THỐNG KÊ SERVER')
      .addFields(
        { name: '👥 Tổng người chơi', value: totalPlayers.toString(), inline: true },
        { name: '💰 Tổng tiền', value: `${totalMoney.toLocaleString('vi-VN')} VND`, inline: true },
        { name: '💵 Tiền trung bình', value: `${avgMoney.toLocaleString('vi-VN')} VND`, inline: true },
        { name: '📈 Tổng XP', value: totalXP.toString(), inline: true },
        { name: '📊 XP trung bình', value: avgXP.toString(), inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: '💼 Thống kê nghề nghiệp', value: jobStats || 'Không có dữ liệu', inline: false }
      )
      .setColor('#32CD32')
      .setFooter({ text: 'Cập nhật theo thời gian thực' });

    message.reply({ embeds: [embed] });
  }

  // List all items
  if (message.content === '!listitems' || message.content === '!itemslist') {
    const isOwner = message.author.id === ownerId;
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

    message.reply({ embeds: [embed] });
  }

  // Give item by ID
  if (message.content.startsWith('!giveitemid')) {
    if (message.author.id !== ownerId) {
      return message.reply('❌ Chỉ owner mới có thể dùng lệnh này!');
    }

    const args = message.content.split(' ');
    if (args.length < 3) {
      return message.reply('Cú pháp: `!giveitemid <@user hoặc userID> <itemID> [số lượng]`\nVí dụ: `!giveitemid @user SSUR1 1`\nDùng `!listitems` để xem danh sách ID');
    }

    const targetUserId = args[1].replace(/[<@!>]/g, '');
    const itemId = args[2].toUpperCase();
    const quantity = parseInt(args[3]) || 1;

    if (quantity < 1 || quantity > 50) {
      return message.reply('Số lượng phải từ 1 đến 50!');
    }

    const item = findItemById(itemId);
    if (!item) {
      return message.reply('❌ Không tìm thấy item với ID này! Dùng `!listitems` để xem danh sách ID');
    }

    const targetUser = userData[targetUserId] || { 
      lastCheckin: null, streak: 0, totalCheckins: 0, 
      money: 0, xp: 0, lastLevel: 1, inventory: [], 
      lastWork: null, selectedJob: null, attemptsToday: 0, isSearchingJob: false 
    };

    targetUser.inventory = targetUser.inventory || [];
    
    for (let i = 0; i < quantity; i++) {
      targetUser.inventory.push(item);
    }

    userData[targetUserId] = targetUser;
    saveData();

    const embed = new EmbedBuilder()
      .setTitle('🎁 TẶNG VẬT PHẨM')
      .setDescription(`Đã tặng cho <@${targetUserId}>:`)
      .addFields(
        { name: '📦 Vật phẩm', value: `${item.name} (${item.id})`, inline: true },
        { name: '📊 Số lượng', value: quantity.toString(), inline: true },
        { name: '💰 Giá trị', value: `${item.sellPrice.toLocaleString('vi-VN')} VND`, inline: true },
        { name: '🎯 Độ hiếm', value: item.rarity.toUpperCase(), inline: true }
      )
      .setColor('#FF69B4');

    message.reply({ embeds: [embed] });
  }
  }); // End of messageCreate event

client.login(token);