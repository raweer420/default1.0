process.env.DEBUG = 'distube:spotify';

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const setupMusicSystem = require('./helpers/musicSystem');
const { setupPlayDl } = require('./preload');
const LogManager = require('./logger/logManager');

// === Função de log inicial ===
function showStartupMessage() {
  console.log('='.repeat(50));
  console.log('BOT DISCORD - SISTEMA DE VERIFICAÇÃO, LOGS E MÚSICA');
  console.log('='.repeat(50));
  console.log(`• Iniciado em: ${new Date().toLocaleString()}`);
  console.log(`• Prefixo: ${config.PREFIX}`);
  console.log(`• Canal de logs: ${config.LOG_CHANNEL_ID}`);
  console.log('='.repeat(50));
}

// === Inicialização do client ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  sweepers: {
    messages: { interval: 60, lifetime: 3600 },
  },
  restTimeOffset: 0,
});

client.commands = new Collection();
client.cooldowns = new Collection();

// === Verificação do canal de logs ===
async function verifyLogChannel() {
  try {
    const logChannel = await client.channels.fetch(config.LOG_CHANNEL_ID);
    const permissions = logChannel.permissionsFor(logChannel.guild.members.me);
    const required = ['ViewChannel', 'SendMessages', 'EmbedLinks'];

    const missing = required.filter(p => !permissions?.has(p));
    if (missing.length > 0) throw new Error(`Permissões faltando: ${missing.join(', ')}`);

    console.log(`✅ Canal de logs: ${logChannel.name} (${logChannel.id})`);
    return true;
  } catch (err) {
    console.error('❌ Erro ao verificar canal de logs:', err);
    return false;
  }
}

// === Carregar eventos ===
function loadEvents() {
  console.log('==== CARREGAMENTO DE EVENTOS ====');
  const eventsPath = path.join(__dirname, 'events');
  fs.readdirSync(eventsPath).filter(f => f.endsWith('.js')).forEach(file => {
    try {
      const event = require(path.join(eventsPath, file));
      const eventName = event.name || file.replace('.js', '');
      if (typeof event.execute !== 'function') return console.warn(`⚠️ Evento "${file}" inválido.`);

      event.once
        ? client.once(eventName, (...args) => event.execute(client, ...args))
        : client.on(eventName, (...args) => event.execute(client, ...args));

      console.log(`✅ Evento carregado: ${eventName}`);
    } catch (err) {
      console.error(`❌ Erro ao carregar evento ${file}:`, err);
    }
  });
}

// === Carregar comandos ===
function loadCommands() {
  console.log('==== CARREGAMENTO DE COMANDOS ====');
  const basePath = path.join(__dirname, 'commands');
  const folders = fs.readdirSync(basePath).filter(f => fs.statSync(path.join(basePath, f)).isDirectory());

  for (const folder of folders) {
    const folderPath = path.join(basePath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));

    console.log(`Comandos na pasta ${folder}: ${commandFiles.join(', ')}`);
    for (const file of commandFiles) {
      try {
        const command = require(path.join(folderPath, file));
        if (command.name) {
          command.category = folder.charAt(0).toUpperCase() + folder.slice(1);
          client.commands.set(command.name, command);
          console.log(`✅ Comando carregado: ${command.name}`);
        }
      } catch (err) {
        console.error(`❌ Erro ao carregar comando ${file}:`, err);
      }
    }
  }
}

// === On Ready ===
client.once('ready', async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  await setupPlayDl();

  if (await verifyLogChannel()) {
    await LogManager.sendLog(client, {
      title: '🟢 Bot Iniciado',
      color: 'Green',
      description: `Bot iniciado em ${new Date().toLocaleString()}`,
      fields: [
        { name: '🤖 Tag', value: client.user.tag, inline: true },
        { name: '🆔 ID', value: client.user.id, inline: true },
        { name: '🎵 Música', value: 'DisTube Ativado', inline: true },
        { name: '📝 Logs', value: 'Ativado ✅', inline: true },
      ],
    });
  }

  client.user.setActivity('verificação de membros', { type: 'Watching' });

  try {
    client.distube = setupMusicSystem(client);
    console.log('✅ Sistema de música inicializado!');
  } catch (err) {
    console.error('❌ Erro ao iniciar sistema de música:', err);
  }
});

// === Manipulação de mensagens ===
client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot || !message.content.startsWith(config.PREFIX)) return;

  const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  const command = client.commands.get(commandName) ||
    client.commands.find(cmd => cmd.aliases?.includes(commandName));

  if (!command) return;

  // Permissão
  const isAdmin = message.guild.ownerId === message.author.id ||
    message.member.roles.cache.has(config.NUKE_ROLE_ID);

  if (!['music', 'utility'].includes(command.category?.toLowerCase()) && !isAdmin) {
    const deniedMsg = await message.reply('❌ Você não tem permissão para usar este comando.');
    await LogManager.sendLog(client, {
      title: '🚫 Comando não autorizado',
      color: 'Red',
      fields: [
        { name: 'Usuário', value: `${message.author.tag} (${message.author.id})`, inline: true },
        { name: 'Comando', value: `\`${config.PREFIX}${commandName}\``, inline: true },
        { name: 'Canal', value: `<#${message.channel.id}>`, inline: true },
      ],
    });
    setTimeout(() => { deniedMsg.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000);
    return;
  }

  // Cooldown
  const { cooldowns } = client;
  if (!cooldowns.has(command.name)) cooldowns.set(command.name, new Collection());

  const now = Date.now();
  const timestamps = cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown || 3) * 1000;

  if (timestamps.has(message.author.id)) {
    const expires = timestamps.get(message.author.id) + cooldownAmount;
    if (now < expires) {
      const timeLeft = (expires - now) / 1000;
      const cooldownMsg = await message.reply(`⏱️ Aguarde ${timeLeft.toFixed(1)}s para usar \`${command.name}\`.`);
      setTimeout(() => cooldownMsg.delete().catch(() => {}), 5000);
      return;
    }
  }

  timestamps.set(message.author.id, now);
  setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

  // Executa comando
  try {
    await command.execute(message, args, client);
  } catch (err) {
    console.error(`❌ Erro no comando ${command.name}:`, err);
    await LogManager.sendLog(client, {
      title: '❌ Erro em comando',
      color: 'Red',
      fields: [
        { name: 'Usuário', value: `${message.author.tag} (${message.author.id})`, inline: true },
        { name: 'Comando', value: `\`${config.PREFIX}${commandName}\``, inline: true },
        { name: 'Erro', value: `\`\`\`${err.message}\`\`\`` },
      ],
    });
    const errorMsg = await message.reply('❌ Ocorreu um erro ao executar este comando.');
    setTimeout(() => { errorMsg.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000);
  }
});

// === Tratamento de erros ===
process.on('unhandledRejection', async err => {
  console.error('❌ Rejeição não tratada:', err);
  if (client.isReady()) await LogManager.logCriticalError(client, err, 'Unhandled Rejection');
});

process.on('uncaughtException', async err => {
  console.error('❌ Exceção não capturada:', err);
  if (client.isReady()) await LogManager.logCriticalError(client, err, 'Uncaught Exception');
  process.exit(1);
});

// === Inicialização ===
showStartupMessage();
loadEvents();
loadCommands();

console.log('Conectando ao Discord...');
client.login(config.TOKEN)
  .then(() => console.log('✅ Bot conectado!'))
  .catch(err => {
    console.error('❌ Erro crítico ao conectar ao Discord:', err);
    LogManager.logCriticalError(client, err, 'Erro de login').finally(() => process.exit(1));
  });