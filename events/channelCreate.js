const { Events, ChannelType } = require('discord.js');
const LogManager = require('../logger/logManager');

module.exports = {
  name: Events.ChannelCreate,
  async execute(client, channel) {
    // Ignorar canais de DM
    if (!channel.guild) return;
    
    try {
      // Tentar obter o criador do canal
      const auditLogs = await channel.guild.fetchAuditLogs({
        type: 10, // CHANNEL_CREATE
        limit: 1
      });
      
      const channelLog = auditLogs.entries.first();
      const creator = channelLog ? channelLog.executor : { tag: 'Desconhecido', id: 'Desconhecido' };
      
      // Determinar o tipo de canal
      let channelType = "Desconhecido";
      if (channel.type === ChannelType.GuildText) channelType = "Texto";
      else if (channel.type === ChannelType.GuildVoice) channelType = "Voz";
      else if (channel.type === ChannelType.GuildCategory) channelType = "Categoria";
      else if (channel.type === ChannelType.GuildAnnouncement) channelType = "Anúncios";
      else if (channel.type === ChannelType.GuildForum) channelType = "Fórum";
      else if (channel.type === ChannelType.GuildStageVoice) channelType = "Palco";
      
      await LogManager.sendLog(client, {
        title: '📂 Canal Criado',
        color: 'Green',
        fields: [
          { name: '📝 Nome', value: channel.name, inline: true },
          { name: '🆔 ID', value: channel.id, inline: true },
          { name: '📋 Tipo', value: channelType, inline: true },
          { name: '👮 Criado por', value: `${creator.tag} (${creator.id})`, inline: true },
          { name: '🔸 Categoria', value: channel.parent ? channel.parent.name : 'Nenhuma', inline: true },
          { name: '📅 Data', value: LogManager.formatTimestamp(Date.now()), inline: true }
        ]
      });
    } catch (error) {
      console.error('❌ Erro ao registrar criação de canal:', error);
    }
  }
};