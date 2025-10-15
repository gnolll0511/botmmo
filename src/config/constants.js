// Constants for emoji reactions
const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];

// Default user state
const defaultUserState = {
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
  overtimeCount: 0
};

// Constants for cooldown times (in milliseconds)
const cooldowns = {
  command: 2000, // 2 seconds
  resetdata: 30000, // 30 seconds
  profile: 5000 // 5 seconds
};

// Banking constants
const banking = {
  interestRate: 0.0002, // 0.02%
  interestPeriod: 5, // 5 minutes
  maxTransactions: 50 // Maximum number of transactions to store
};

// Game constants
const game = {
  maxLevel: 1000,
  baseXpPerMessage: 10,
  baseXpPerVoiceMinute: 20,
  baseDailyReward: 5000,
  maxOvertimePerDay: 3,
  overtimeHours: 4
};

// Embed colors
const colors = {
  success: '#00FF00',
  error: '#FF0000',
  warning: '#FFA500',
  info: '#0099FF',
  neutral: '#4169E1'
};

module.exports = {
  numberEmojis,
  defaultUserState,
  cooldowns,
  banking,
  game,
  colors
};