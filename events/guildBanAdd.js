const { Events } = require('discord.js');
const LogManager = require('../logger/logManager');

module.exports = {
  name: Events.GuildBanAdd,
  async execute(client, ban) {
    try {
      // Tentar obter mais informações sobre o ban do audit log
      const auditLogs = await ban.guild.fetchAuditLogs({
        type: 22, // BAN_ADD
        limit: 1
      });
      
      const banLog = auditLogs.entries.first();
      const moderator = banLog ? banLog.executor : { tag: 'Desconhecido', id: 'Desconhecido' };
      const reason = banLog ? banLog.reason || 'Nenhum motivo fornecido' : 'Nenhum motivo fornecido';
      
      // Não conseguimos saber se foi executado há muito tempo, então só registramos se foi recente
      if (banLog && Date.now() - banLog.createdTimestamp > 5000) return;
      
      await LogManager.sendLog(client, {
        title: '🔨 Usuário Banido',
        color: 'DarkRed',
        thumbnail: ban.user.displayAvatarURL(),
        fields: [
          { name: '👤 Usuário', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
          { name: '👮 Moderador', value: `${moderator.tag} (${moderator.id})`, inline: true },
          { name: '📅 Data', value: LogManager.formatTimestamp(Date.now()), inline: true },
          { name: '📝 Motivo', value: LogManager.truncate(reason) }
        ]
      });
    } catch (error) {
      console.error('❌ Erro ao registrar banimento:', error);
    }
  }
};