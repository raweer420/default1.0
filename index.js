process.env.DEBUG = 'distube:spotify';

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const setupMusicSystem = require('./helpers/musicSystem');
const { setupPlayDl } = require('./preload');
const LogManager = require('./logger/logManager');

// Função para mostrar mensagem inicial estilizada
function showStartupMessage() {
  console.log('='.repeat(50));
  console.log('BOT DISCORD - SISTEMA DE VERIFICAÇÃO, LOGS E MÚSICA');
  console.log('='.repeat(50));
  console.log(`• Iniciado em: ${new Date().toLocaleString()}`);
  console.log(`• Prefixo: ${config.PREFIX}`);
  console.log(`• Canal de logs: ${config.LOG_CHANNEL_ID}`);
  console.log('='.repeat(50));
}

// Inicializa cliente Discord com intents e partials necessários
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  sweepers: {
    messages: {
      interval: 60,
      lifetime: 3600
    }
  },
  restTimeOffset: 0
});

client.commands = new Collection();
client.cooldowns = new Collection();

showStartupMessage();

// Verifica se o canal de logs está configurado e acessível
async function verifyLogChannel() {
  if (!config.LOG_CHANNEL_ID) {
    console.error('❌ ERRO CRÍTICO: Canal de logs não configurado!');
    return false;
  }

  try {
    const logChannel = await client.channels.fetch(config.LOG_CHANNEL_ID);
    console.log(`✅ Canal de logs encontrado: ${logChannel.name} (${logChannel.id})`);

    const botMember = logChannel.guild.members.me;
    const permissions = logChannel.permissionsFor(botMember);

    const requiredPermissions = ['ViewChannel', 'SendMessages', 'EmbedLinks'];

    const missingPermissions = requiredPermissions.filter(p => !permissions.has(p));
    if (missingPermissions.length > 0) {
      console.error(`❌ Permissões faltantes no canal de logs: ${missingPermissions.join(', ')}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar canal de logs:', error);
    return false;
  }
}

// Carrega todos os eventos da pasta /events
console.log('==== CARREGAMENTO DE EVENTOS ====');
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  try {
    const event = require(path.join(eventsPath, file));
    const eventName = event.name || file.split('.')[0];

    if (event.execute) {
      if (event.once) {
        client.once(eventName, (...args) => event.execute(client, ...args));
      } else {
        client.on(eventName, (...args) => event.execute(client, ...args));
      }
      console.log(`✅ Evento carregado: ${eventName}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao carregar evento ${file}:`, error);
  }
}

// Carrega comandos organizados em subpastas da pasta /commands
console.log('==== CARREGAMENTO DE COMANDOS ====');
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath).filter(f => fs.statSync(path.join(commandsPath, f)).isDirectory());

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
  
  console.log(`Comandos na pasta ${folder}: ${commandFiles.join(', ')}`);

  for (const file of commandFiles) {
    try {
      const command = require(path.join(folderPath, file));
      if (command.name) {
        command.category = folder.charAt(0).toUpperCase() + folder.slice(1);
        client.commands.set(command.name, command);
        console.log(`✅ Comando carregado: ${command.name}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao carregar comando ${file}:`, error);
    }
  }
}

// Evento 'ready' para inicializar o bot
client.once('ready', async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);

  // Configurar play-dl (para música)
  await setupPlayDl();

  // Verificar canal de logs
  const logChannelVerified = await verifyLogChannel();

  // Enviar log de inicialização para canal de logs
  try {
    if (logChannelVerified) {
      await LogManager.sendLog(client, {
        title: '🟢 Bot Iniciado',
        color: 'Green',
        description: `Bot foi iniciado com sucesso em ${new Date().toLocaleString()}`,
        fields: [
          { name: '🤖 Tag', value: client.user.tag, inline: true },
          { name: '🆔 ID', value: client.user.id, inline: true },
          { name: '📡 Status', value: 'Online e Operacional', inline: true },
          { name: '🎵 Sistema de Música', value: 'DisTube Ativado', inline: true },
          { name: '📝 Sistema de Logs', value: logChannelVerified ? 'Ativado ✅' : 'Configuração Incompleta ⚠️', inline: true }
        ]
      });
    }
  } catch (logError) {
    console.error('❌ Erro ao enviar log de inicialização:', logError);
  }

  // Setar atividade do bot
  client.user.setActivity('verificação de membros', { type: 'Watching' });

  // Inicializar sistema de música
  console.log('🎵 Inicializando sistema de música...');
  try {
    const distube = setupMusicSystem(client);
    if (distube) {
      console.log('✅ Sistema de música inicializado com sucesso!');
    } else {
      console.error('❌ Falha ao inicializar sistema de música');
    }
  } catch (error) {
    console.error('❌ Erro ao configurar sistema de música:', error);
  }
});

// Listener para comandos prefixados
client.on('messageCreate', async message => {
  if (!message.content.startsWith(config.PREFIX) || message.author.bot) return;

  const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName) ||
    client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

  if (!command) return;

  // Função para checar permissões administrativas
  const checkPermission = (msg) => {
    if (!msg.guild) return false;
    if (msg.guild.ownerId === msg.author.id) return true;

    const adminRoles = [
      config.NUKE_ROLE_ID,
      // Outros IDs de cargos administrativos podem ser adicionados aqui
    ];

    return adminRoles.some(roleId => msg.member.roles.cache.has(roleId));
  };

  // Bloquear comandos administrativos para usuários sem permissão
  if (!['music', 'utility'].includes(command.category.toLowerCase()) && !checkPermission(message)) {
    try {
      const deniedMessage = await message.reply('❌ Você não tem permissão para usar este comando.');

      // Log da tentativa não autorizada
      await LogManager.sendLog(client, {
        title: '🚫 Tentativa de Comando Não Autorizada',
        color: 'Red',
        fields: [
          { name: '👤 Usuário', value: `${message.author.tag} (${message.author.id})`, inline: true },
          { name: '📝 Comando', value: `\`${config.PREFIX}${commandName}\``, inline: true },
          { name: '📍 Canal', value: `${message.channel.name} (<#${message.channel.id}>)`, inline: true }
        ]
      });

      // Deletar mensagens após 5 segundos
      setTimeout(() => {
        deniedMessage.delete().catch(() => {});
        message.delete().catch(() => {});
      }, 5000);

      return;
    } catch (logError) {
      console.error('Erro ao registrar comando não autorizado:', logError);
    }
  }

  // Gerenciar cooldowns
  const { cooldowns } = client;
  if (!cooldowns.has(command.name)) {
    cooldowns.set(command.name, new Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown || 3) * 1000;

  if (timestamps.has(message.author.id)) {
    const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      const cooldownMsg = await message.reply(
        `⏱️ Aguarde ${timeLeft.toFixed(1)} segundos antes de usar o comando \`${command.name}\` novamente.`
      );

      setTimeout(() => {
        cooldownMsg.delete().catch(() => {});
        message.delete().catch(() => {});
      }, 5000);
      return;
    }
  }

  timestamps.set(message.author.id, now);
  setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

  // Executar comando
  try {
    console.log(`🔄 Executando comando: ${command.name} (Usuário: ${message.author.tag})`);
    await command.execute(message, args, client);
  } catch (error) {
    console.error(`❌ Erro no comando ${command.name}:`, error);

    try {
      await LogManager.sendLog(client, {
        title: '❌ Erro em Comando',
        color: 'Red',
        description: `Erro ao executar o comando \`${command.name}\``,
        fields: [
          { name: '👤 Usuário', value: `${message.author.tag} (${message.author.id})`, inline: true },
          { name: '📝 Comando', value: `\`${config.PREFIX}${commandName}\``, inline: true },
          { name: '🔍 Erro', value: `\`\`\`${error.message}\`\`\`` }
        ]
      });
    } catch (logError) {
      console.error('Erro ao registrar erro de comando:', logError);
    }

    const errorMsg = await message.reply('❌ Ocorreu um erro ao executar este comando.');
    setTimeout(() => {
      errorMsg.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 5000);
  }
});

// Comando teste para verificar se o bot está online e respondendo
client.on('messageCreate', message => {
  if (message.content === '!!teste') {
    const pingMs = Date.now() - message.createdTimestamp;
    message.reply(`✅ Bot funcionando! Ping: ${pingMs}ms | API: ${Math.round(client.ws.ping)}ms`);
  }
});

// Tratamento global de erros não tratados e exceções
process.on('unhandledRejection', async (error) => {
  console.error('❌ Erro não tratado:', error);
  
  if (client.isReady()) {
    try {
      await LogManager.logCriticalError(client, error, 'Unhandled Rejection');
    } catch (logError) {
      console.error('❌ Erro ao registrar erro crítico:', logError);
    }
  }
});

process.on('uncaughtException', async (error) => {
  console.error('❌ Exceção não capturada:', error);
  
  if (client.isReady()) {
    try {
      await LogManager.logCriticalError(client, error, 'Uncaught Exception');
    } catch (logError) {
      console.error('❌ Erro ao registrar erro crítico:', logError);
    }
  }
  
  process.exit(1);
});

// Login no Discord
console.log('Conectando ao Discord...');
client.login(config.TOKEN)
  .then(() => {
    console.log('✅ Bot conectado ao Discord com sucesso!');
  })
  .catch(error => {
    console.error('❌ Erro crítico ao conectar ao Discord:', error);
    LogManager.logCriticalError(client, error, 'Falha na Conexão do Bot');
    process.exit(1);
  });
