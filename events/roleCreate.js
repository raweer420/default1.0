const { Events } = require('discord.js');
const LogManager = require('../logger/logManager');

module.exports = {
  name: Events.GuildRoleCreate,
  async execute(client, role) {
    try {
      // Tentar obter o criador do cargo
      const auditLogs = await role.guild.fetchAuditLogs({
        type: 30, // ROLE_CREATE
        limit: 1
      });
      
      const roleLog = auditLogs.entries.first();
      const creator = roleLog ? roleLog.executor : { tag: 'Desconhecido', id: 'Desconhecido' };
      
      await LogManager.sendLog(client, {
        title: '🏷️ Cargo Criado',
        color: 'Green',
        fields: [
          { name: '📝 Nome', value: role.name, inline: true },
          { name: '🆔 ID', value: role.id, inline: true },
          { name: '🎨 Cor', value: role.hexColor, inline: true },
          { name: '👮 Criado por', value: `${creator.tag} (${creator.id})`, inline: true },
          { name: '📊 Posição', value: `${role.position}`, inline: true },
          { name: '🏁 Mencionável', value: role.mentionable ? 'Sim' : 'Não', inline: true },
          { name: '📅 Data', value: LogManager.formatTimestamp(Date.now()) }
        ]
      });
    } catch (error) {
      console.error('❌ Erro ao registrar criação de cargo:', error);
    }
  }
};