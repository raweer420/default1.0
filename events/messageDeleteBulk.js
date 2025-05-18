// commands/moderation/moderate.js
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const LogManager = require('../../logger/logManager');

module.exports = {
  name: 'moderate',
  description: 'Sistema unificado de moderação (warn, mute, kick, ban)',
  aliases: ['mod'],
  usage: '<@usuário> <warn|mute|kick|ban> [duração para mute] [motivo]',
  permissions: 'ManageMessages',
  cooldown: 3,
  
  async execute(message, args, client) {
    // Verificar permissões
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply('❌ Você não tem permissão para usar comandos de moderação.');
    }
    
    // Verificar argumentos
    if (args.length < 2) {
      return message.reply(`❌ Uso incorreto! Use: \`${client.config.PREFIX}moderate <@usuário> <warn|mute|kick|ban> [duração para mute] [motivo]\``);
    }
    
    // Analisar argumentos
    const userMention = args[0];
    const action = args[1].toLowerCase();
    let duration = null;
    let reason = null;
    
    // Verificar ação solicitada
    const validActions = ['warn', 'mute', 'kick', 'ban'];
    if (!validActions.includes(action)) {
      return message.reply(`❌ Ação inválida! Use uma das seguintes: ${validActions.join(', ')}`);
    }
    
    // Obter usuário mencionado
    const userId = userMention.replace(/[<@!>]/g, '');
    let targetMember;
    try {
      targetMember = await message.guild.members.fetch(userId);
    } catch (error) {
      return message.reply('❌ Usuário não encontrado. Certifique-se de mencionar um usuário válido.');
    }
    
    // Verificar se o bot pode moderar o usuário alvo
    if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
      return message.reply('❌ Você não pode moderar um usuário com cargo igual ou superior ao seu.');
    }
    
    if (targetMember.roles.highest.position >= message.guild.members.me.roles.highest.position) {
      return message.reply('❌ Não posso moderar um usuário com cargo superior ao meu.');
    }
    
    // Processar duração para mute
    if (action === 'mute' && args.length > 2) {
      const durationArg = args[2].toLowerCase();
      const durationRegex = /^(\d+)(s|m|h|d)$/;
      const match = durationArg.match(durationRegex);
      
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        
        // Converter para milissegundos
        const multipliers = {
          's': 1000, // segundo
          'm': 60 * 1000, // minuto
          'h': 60 * 60 * 1000, // hora
          'd': 24 * 60 * 60 * 1000 // dia
        };
        
        duration = value * multipliers[unit];
        reason = args.slice(3).join(' ') || 'Nenhum motivo fornecido';
      } else {
        // Se não for um formato de duração válido, considerar como parte do motivo
        reason = args.slice(2).join(' ') || 'Nenhum motivo fornecido';
      }
    } else {
      // Para outras ações, o motivo começa no terceiro argumento
      reason = args.slice(2).join(' ') || 'Nenhum motivo fornecido';
    }
    
    // Executar a ação solicitada
    try {
      switch (action) {
        case 'warn':
          await handleWarn(message, targetMember, reason);
          break;
        case 'mute':
          await handleMute(message, targetMember, duration, reason);
          break;
        case 'kick':
          await handleKick(message, targetMember, reason);
          break;
        case 'ban':
          await handleBan(message, targetMember, reason);
          break;
      }
      
      // Registrar ação no sistema de logs
      const durationText = duration ? formatDuration(duration) : null;
      
      await LogManager.logModAction(client, {
        moderator: message.author,
        target: targetMember.user,
        action: action.toUpperCase(),
        reason,
        duration: durationText
      });
      
    } catch (error) {
      console.error(`❌ Erro ao executar ação ${action}:`, error);
      return message.reply(`❌ Ocorreu um erro ao executar a ação: ${error.message}`);
    }
  }
};

// Função para lidar com advertências
async function handleWarn(message, targetMember, reason) {
  // Enviar advertência ao usuário via DM
  try {
    await targetMember.send(`⚠️ Você recebeu uma advertência no servidor **${message.guild.name}**\n**Motivo:** ${reason}\n**Moderador:** ${message.author.tag}`);
  } catch (err) {
    console.log(`Não foi possível enviar DM para ${targetMember.user.tag}`);
  }
  
  // Confirmar no canal que a advertência foi enviada
  const embed = new EmbedBuilder()
    .setTitle('⚠️ Usuário Advertido')
    .setColor('#FFCC00')
    .setDescription(`${targetMember.user.tag} foi advertido.`)
    .addFields(
      { name: 'Usuário', value: `${targetMember}`, inline: true },
      { name: 'Moderador', value: `${message.author}`, inline: true },
      { name: 'Motivo', value: reason }
    )
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

// Função para lidar com silenciamentos
async function handleMute(message, targetMember, duration, reason) {
  // Verificar se o bot tem permissão
  if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    throw new Error('Não tenho permissão para silenciar membros.');
  }
  
  // Calcular duração (padrão: 10 minutos)
  const muteTime = duration || 10 * 60 * 1000;
  const expireTime = new Date(Date.now() + muteTime);
  
  // Silenciar usuário
  await targetMember.timeout(muteTime, reason);
  
  // Notificar usuário via DM
  try {
    await targetMember.send(`🔇 Você foi silenciado no servidor **${message.guild.name}**\n**Duração:** ${formatDuration(muteTime)}\n**Motivo:** ${reason}\n**Moderador:** ${message.author.tag}`);
  } catch (err) {
    console.log(`Não foi possível enviar DM para ${targetMember.user.tag}`);
  }
  
  // Confirmar no canal
  const embed = new EmbedBuilder()
    .setTitle('🔇 Usuário Silenciado')
    .setColor('#FF9900')
    .setDescription(`${targetMember.user.tag} foi silenciado.`)
    .addFields(
      { name: 'Usuário', value: `${targetMember}`, inline: true },
      { name: 'Moderador', value: `${message.author}`, inline: true },
      { name: 'Duração', value: formatDuration(muteTime), inline: true },
      { name: 'Expira em', value: `<t:${Math.floor(expireTime.getTime() / 1000)}:R>`, inline: true },
      { name: 'Motivo', value: reason }
    )
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

// Função para lidar com expulsões
async function handleKick(message, targetMember, reason) {
  // Verificar se o bot tem permissão
  if (!message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
    throw new Error('Não tenho permissão para expulsar membros.');
  }
  
  // Notificar usuário via DM antes de expulsar
  try {
    await targetMember.send(`👢 Você foi expulso do servidor **${message.guild.name}**\n**Motivo:** ${reason}\n**Moderador:** ${message.author.tag}`);
  } catch (err) {
    console.log(`Não foi possível enviar DM para ${targetMember.user.tag}`);
  }
  
  // Expulsar usuário
  await targetMember.kick(reason);
  
  // Confirmar no canal
  const embed = new EmbedBuilder()
    .setTitle('👢 Usuário Expulso')
    .setColor('#FF3300')
    .setDescription(`${targetMember.user.tag} foi expulso do servidor.`)
    .addFields(
      { name: 'Usuário', value: `${targetMember.user.tag} (${targetMember.user.id})`, inline: true },
      { name: 'Moderador', value: `${message.author.tag}`, inline: true },
      { name: 'Motivo', value: reason }
    )
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

// Função para lidar com banimentos
async function handleBan(message, targetMember, reason) {
  // Verificar se o bot tem permissão
  if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
    throw new Error('Não tenho permissão para banir membros.');
  }
  
  // Notificar usuário via DM antes de banir
  try {
    await targetMember.send(`🔨 Você foi banido do servidor **${message.guild.name}**\n**Motivo:** ${reason}\n**Moderador:** ${message.author.tag}`);
  } catch (err) {
    console.log(`Não foi possível enviar DM para ${targetMember.user.tag}`);
  }
  
  // Banir usuário
  await targetMember.ban({ reason });
  
  // Confirmar no canal
  const embed = new EmbedBuilder()
    .setTitle('🔨 Usuário Banido')
    .setColor('#CC0000')
    .setDescription(`${targetMember.user.tag} foi banido permanentemente do servidor.`)
    .addFields(
      { name: 'Usuário', value: `${targetMember.user.tag} (${targetMember.user.id})`, inline: true },
      { name: 'Moderador', value: `${message.author.tag}`, inline: true },
      { name: 'Motivo', value: reason }
    )
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

// Função para formatar duração em texto legível
function formatDuration(ms) {
  // Converter milissegundos para unidades de tempo
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  
  // Construir string de duração
  const parts = [];
  
  if (days > 0) parts.push(`${days} dia${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hora${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minuto${minutes !== 1 ? 's' : ''}`);
  if (seconds > 0) parts.push(`${seconds} segundo${seconds !== 1 ? 's' : ''}`);
  
  return parts.join(', ') || 'menos de 1 segundo';
}