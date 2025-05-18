const { Events } = require('discord.js');
const LogManager = require('../logger/logManager');

module.exports = {
  name: Events.GuildBanRemove,
  async execute(client, ban) {
    try {
      // Tentar obter mais informações sobre o unban do audit log
      const auditLogs = await ban.guild.fetchAuditLogs({
        type: 23, // BAN_REMOVE
        limit: 1
      });
      
      const unbanLog = auditLogs.entries.first();
      const moderator = unbanLog ? unbanLog.executor : { tag: 'Desconhecido', id: 'Desconhecido' };
      
      // Não conseguimos saber se foi executado há muito tempo, então só registramos se foi recente
      if (unbanLog && Date.now() - unbanLog.createdTimestamp > 5000) return;
      
      await LogManager.sendLog(client, {
        title: '🔓 Usuário Desbanido',
        color: 'Green',
        thumbnail: ban.user.displayAvatarURL(),
        fields: [
          { name: '👤 Usuário', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
          { name: '👮 Moderador', value: `${moderator.tag} (${moderator.id})`, inline: true },
          { name: '📅 Data', value: LogManager.formatTimestamp(Date.now()), inline: true }
        ]
      });
    } catch (error) {
      console.error('❌ Erro ao registrar desbanimento:', error);
    }
  }
};