const { Events } = require('discord.js');
const LogManager = require('../logger/logManager');

module.exports = {
  name: Events.InviteDelete,
  async execute(client, invite) {
    try {
      await LogManager.sendLog(client, {
        title: '🔗 Convite Excluído',
        color: 'Orange',
        fields: [
          { name: '📝 Código', value: invite.code, inline: true },
          { name: '📅 Data', value: LogManager.formatTimestamp(Date.now()), inline: true },
          { name: '📝 Canal', value: invite.channel ? `${invite.channel.name} (<#${invite.channel.id}>)` : 'Desconhecido', inline: true }
        ]
      });
    } catch (error) {
      console.error('❌ Erro ao registrar exclusão de convite:', error);
    }
  }
};