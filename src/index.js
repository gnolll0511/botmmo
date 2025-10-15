const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { token, ownerId } = require('./config/config');
const { defaultUserState, cooldowns } = require('./config/constants');
const { loadData, saveData, getLevelInfo } = require('./utils/dataUtils');
const { checkLevelUp, handleWork } = require('./utils/workUtils');
const { getBacayResult, getBlackjackResult, getSlotResult } = require('./utils/gameUtils');
const { getRandomItem, getAllItemsList, getShopItemsList, findItemById } = require('./utils/itemUtils');

// Initialize client
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

// Global data
const profileProcessing = new Map();
const commandCooldown = new Map();
const lastMessageTime = new Map();

// Load user data
let userData = loadData();

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
  const user = userData[userId] || defaultUserState;

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
  saveData(userData);
});

// Message handler
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const now = Date.now();

  // XP for chat (light, with cooldown)
  const lastTime = lastMessageTime.get(message.author.id) || 0;
  if (now - lastTime > 60000) { // 1 minute cooldown
    const user = userData[message.author.id] || defaultUserState;
    user.xp += 10; // 10 XP per message with cooldown
    checkLevelUp(user, message);
    userData[message.author.id] = user;
    saveData(userData);
    lastMessageTime.set(message.author.id, now);
  }

  // Commands
  if (!message.content.startsWith('!')) return;

  // Command cooldown check
  if (commandCooldown.has(message.author.id)) {
    const lastUsed = commandCooldown.get(message.author.id);
    const cooldown = message.content === '!resetdata' ? cooldowns.resetdata : cooldowns.command;
    if (now - lastUsed < cooldown) {
      return message.reply('Vui lòng chờ một chút trước khi dùng lệnh này lại.');
    }
  }
  commandCooldown.set(message.author.id, now);

  // Process commands
  const command = message.content.split(' ')[0].slice(1).toLowerCase();
  const args = message.content.split(' ').slice(1);

  // Command handlers here...
  // You'll want to move each command handler to its own file in a commands directory
  // and then dynamically load them to keep the code organized
});

// Error handling
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Login
console.log('Attempting to login...');
client.login(token)
  .then(() => {
    console.log('Login successful!');
  })
  .catch(error => {
    console.error('Login failed:', error);
  });