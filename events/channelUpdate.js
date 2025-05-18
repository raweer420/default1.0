const { Events, ChannelType } = require('discord.js');
const LogManager = require('../logger/logManager');

module.exports = {
  name: Events.ChannelUpdate,
  async execute(client, oldChannel, newChannel) {
    // Ignorar canais de DM
    if (!oldChannel.guild) return;
    
    try {
      // Tentar obter quem modificou o canal
      const auditLogs = await newChannel.guild.fetchAuditLogs({
        type: 11, // CHANNEL_UPDATE
        limit: 1
      });
      
      const channelLog = auditLogs.entries.first();
      
      // Verifique se o audit log é recente (menos de 5 segundos)
      if (!channelLog || Date.now() - channelLog.createdTimestamp > 5000) return;
      
      const updater = channelLog.executor;
      
      // Verificar o que foi alterado
      const changes = [];
      
      // Nome do canal
      if (oldChannel.name !== newChannel.name) {
        changes.push({
          name: '📝 Nome',
          value: `\`${oldChannel.name}\` → \`${newChannel.name}\``
        });
      }
      
      // Tópico (para canais de texto)
      if (oldChannel.topic !== newChannel.topic && 
          [ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(newChannel.type)) {
        changes.push({
          name: '📌 Tópico',
          value: `\`${oldChannel.topic || 'Nenhum'}\` → \`${newChannel.topic || 'Nenhum'}\``
        });
      }
      
      // NSFW
      if (oldChannel.nsfw !== newChannel.nsfw && 
          [ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(newChannel.type)) {
        changes.push({
          name: '🔞 NSFW',
          value: `\`${oldChannel.nsfw ? 'Sim' : 'Não'}\` → \`${newChannel.nsfw ? 'Sim' : 'Não'}\``
        });
      }
      
      // Categoria
      if (oldChannel.parentId !== newChannel.parentId) {
        const oldCategory = oldChannel.parent ? oldChannel.parent.name : 'Nenhuma';
        const newCategory = newChannel.parent ? newChannel.parent.name : 'Nenhuma';
        
        changes.push({
          name: '📁 Categoria',
          value: `\`${oldCategory}\` → \`${newCategory}\``
        });
      }
      
      // Limite de usuários (para canais de voz)
      if (oldChannel.userLimit !== newChannel.userLimit && 
          [ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(newChannel.type)) {
        changes.push({
          name: '👥 Limite de Usuários',
          value: `\`${oldChannel.userLimit || 'Ilimitado'}\` → \`${newChannel.userLimit || 'Ilimitado'}\``
        });
      }
      
      // Taxa de Bitrate (para canais de voz)
      if (oldChannel.bitrate !== newChannel.bitrate && 
          [ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(newChannel.type)) {
        changes.push({
          name: '🎵 Bitrate',
          value: `\`${oldChannel.bitrate / 1000} kbps\` → \`${newChannel.bitrate / 1000} kbps\``
        });
      }
      
      // Slowmode (para canais de texto)
      if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser && 
          [ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(newChannel.type)) {
        const oldSlowmode = oldChannel.rateLimitPerUser > 0 ? `${oldChannel.rateLimitPerUser} segundos` : 'Desativado';
        const newSlowmode = newChannel.rateLimitPerUser > 0 ? `${newChannel.rateLimitPerUser} segundos` : 'Desativado';
        
        changes.push({
          name: '⏱️ Modo Lento',
          value: `\`${oldSlowmode}\` → \`${newSlowmode}\``
        });
      }
      
      // Se nenhuma alteração rastreada foi feita, sair
      if (changes.length === 0) return;
      
      // Determinar o tipo de canal
      let channelType = "Desconhecido";
      if (newChannel.type === ChannelType.GuildText) channelType = "Texto";
      else if (newChannel.type === ChannelType.GuildVoice) channelType = "Voz";
      else if (newChannel.type === ChannelType.GuildCategory) channelType = "Categoria";
      else if (newChannel.type === ChannelType.GuildAnnouncement) channelType = "Anúncios";
      else if (newChannel.type === ChannelType.GuildForum) channelType = "Fórum";
      else if (newChannel.type === ChannelType.GuildStageVoice) channelType = "Palco";
      
      // Montar os campos do embed
      const fields = [
        { name: '🆔 Canal', value: `${newChannel.name} (<#${newChannel.id}>)`, inline: true },
        { name: '📋 Tipo', value: channelType, inline: true },
        { name: '👮 Atualizado por', value: `${updater.tag} (${updater.id})`, inline: true },
        { name: '📅 Data', value: LogManager.formatTimestamp(Date.now()), inline: false }
      ];
      
      // Adicionar as alterações aos campos
      fields.push(...changes);
      
      await LogManager.sendLog(client, {
        title: '🔄 Canal Atualizado',
        color: 'Blue',
        fields: fields
      });
    } catch (error) {
      console.error('❌ Erro ao registrar atualização de canal:', error);
    }
  }
};