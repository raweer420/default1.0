const { Events } = require('discord.js');
const LogManager = require('../logger/logManager');

module.exports = {
  name: Events.GuildRoleDelete,
  async execute(client, role) {
    try {
      // Tentar obter quem excluiu o cargo
      const auditLogs = await role.guild.fetchAuditLogs({
        type: 32, // ROLE_DELETE
        limit: 1
      });
      
      const roleLog = auditLogs.entries.first();
      const deleter = roleLog ? roleLog.executor : { tag: 'Desconhecido', id: 'Desconhecido' };
      
      await LogManager.sendLog(client, {
        title: '🗑️ Cargo Excluído',
        color: 'Red',
        fields: [
          { name: '📝 Nome', value: role.name, inline: true },
          { name: '🆔 ID', value: role.id, inline: true },
          { name: '🎨 Cor', value: role.hexColor, inline: true },
          { name: '👮 Excluído por', value: `${deleter.tag} (${deleter.id})`, inline: true },
          { name: '📅 Data', value: LogManager.formatTimestamp(Date.now()) }
        ]
      });
    } catch (error) {
      console.error('❌ Erro ao registrar exclusão de cargo:', error);
    }
  }
};