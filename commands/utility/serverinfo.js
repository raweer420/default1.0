// commands/utility/serverinfo.js
const { EmbedBuilder, ChannelType } = require('discord.js');
const moment = require('moment');
// Configurar momento para português do Brasil
moment.locale('pt-br');

module.exports = {
  name: 'serverinfo',
  description: 'Mostra informações detalhadas sobre o servidor',
  aliases: ['server', 'si', 'guildinfo'],
  cooldown: 5,
  
  async execute(message, args, client) {
    const guild = message.guild;
    
    // Obter informações mais detalhadas do servidor
    await guild.fetch();
    
    // Contagem de canais por tipo
    const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const categoryChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
    const announcementChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildAnnouncement).size;
    const threadChannels = guild.channels.cache.filter(c => c.isThread()).size;
    const forumChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildForum).size;
    
    // Contagem de cargos e emojis
    const roles = guild.roles.cache.size;
    const emojis = guild.emojis.cache.size;
    const stickers = guild.stickers?.cache.size || 0;
    
    // Contagem de boosts
    const boostLevel = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount;
    
    // Contagem de membros
    const totalMembers = guild.memberCount;
    const botCount = guild.members.cache.filter(member => member.user.bot).size;
    const humanCount = totalMembers - botCount;
    
    // Status de membros (online, ausente, ocupado, offline)
    let onlineCount = 0;
    let idleCount = 0;
    let dndCount = 0;
    let offlineCount = 0;
    
    // Obter presença apenas dos membros em cache (limitação da API)
    guild.members.cache.forEach(member => {
      switch (member.presence?.status) {
        case 'online': onlineCount++; break;
        case 'idle': idleCount++; break;
        case 'dnd': dndCount++; break;
        default: offlineCount++;
      }
    });
    
    // Data de criação do servidor
    const createdAt = moment(guild.createdAt).format('LL');
    const createdDays = moment().diff(guild.createdAt, 'days');
    
    // Criar embed com informações
    const embed = new EmbedBuilder()
      .setTitle(`📊 Informações do Servidor: ${guild.name}`)
      .setColor('#3498db')
      .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
      .addFields(
        { name: '📝 Nome', value: guild.name, inline: true },
        { name: '🆔 ID', value: guild.id, inline: true },
        { name: '👑 Dono', value: `<@${guild.ownerId}>`, inline: true },
        { name: '📆 Criado em', value: `${createdAt} (${createdDays} dias atrás)`, inline: false },
        { name: '👥 Membros', value: `Total: ${totalMembers} | Humanos: ${humanCount} | Bots: ${botCount}`, inline: false },
        { name: '📊 Status', value: `🟢 Online: ${onlineCount} | 🟡 Ausente: ${idleCount} | 🔴 Ocupado: ${dndCount} | ⚪ Offline: ${offlineCount}`, inline: false },
        { name: '💬 Canais', value: `💬 Texto: ${textChannels} | 🔊 Voz: ${voiceChannels} | 📢 Anúncios: ${announcementChannels} | 📂 Categorias: ${categoryChannels} | 🧵 Threads: ${threadChannels} | 📋 Fóruns: ${forumChannels}`, inline: false },
        { name: '🏆 Boost', value: `Nível: ${boostLevel} | Impulsos: ${boostCount}`, inline: true },
        { name: '📊 Outros', value: `Cargos: ${roles} | Emojis: ${emojis} | Stickers: ${stickers}`, inline: true }
      );
    
    // Adicionar banner e imagem de convite se disponíveis
    if (guild.banner) {
      embed.setImage(guild.bannerURL({ dynamic: true, size: 1024 }));
    }
    
    // Adicionar descrição se disponível
    if (guild.description) {
      embed.setDescription(guild.description);
    }
    
    // Adicionar recurso se disponível
    if (guild.features.length > 0) {
      const features = guild.features.map(feature => {
        // Formatar nomes de recursos
        return feature
          .toLowerCase()
          .replace(/_/g, ' ')
          .replace(/\b\w/g, char => char.toUpperCase());
      }).join(', ');
      
      embed.addFields({ name: '✨ Recursos', value: features });
    }
    
    await message.reply({ embeds: [embed] });
  }
};