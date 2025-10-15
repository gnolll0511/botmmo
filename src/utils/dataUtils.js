const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../../userData.json');

// Load user data
function loadData() {
  if (fs.existsSync(dataPath)) {
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }
  return {};
}

// Save user data
function saveData(userData) {
  fs.writeFileSync(dataPath, JSON.stringify(userData, null, 2));
}

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

function createBankingProfile(userId, userData) {
  if (!userData[userId].banking) {
    userData[userId].banking = {
      balance: 0,
      transactions: [],
      createdAt: new Date().toISOString(),
      lastInterestCheck: new Date().toISOString()
    };
    saveData(userData);
  }
  return userData[userId].banking;
}

function addTransaction(userId, type, amount, description, targetId = null, userData) {
  if (!userData[userId].banking) createBankingProfile(userId, userData);
  
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
  
  saveData(userData);
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

function calculateBankInterest(userId, userData) {
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
      addTransaction(userId, 'deposit', interest, 'Lãi suất ngân hàng', null, userData);
      saveData(userData);
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

module.exports = {
  loadData,
  saveData,
  getLevelInfo,
  createBankingProfile,
  addTransaction,
  formatTransactionHistory,
  calculateBankInterest
};