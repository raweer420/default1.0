const { Events } = require('discord.js');
const LogManager = require('../logger/logManager');

module.exports = {
  name: Events.InviteCreate,
  async execute(client, invite) {
    try {
      await LogManager.sendLog(client, {
        title: '🔗 Convite Criado',
        color: 'Green',
        thumbnail: invite.inviter?.displayAvatarURL(),
        fields: [
          { name: '👤 Criado por', value: invite.inviter ? `${invite.inviter.tag} (${invite.inviter.id})` : 'Desconhecido', inline: true },
          { name: '📝 Código', value: invite.code, inline: true },
          { name: '📅 Data', value: LogManager.formatTimestamp(Date.now()), inline: true },
          { name: '🏁 Usos máximos', value: invite.maxUses ? invite.maxUses.toString() : 'Ilimitado', inline: true },
          { name: '⏳ Expira em', value: invite.maxAge ? formatExpiryTime(invite.maxAge) : 'Nunca', inline: true },
          { name: '📝 Canal de destino', value: invite.channel ? `${invite.channel.name} (<#${invite.channel.id}>)` : 'Desconhecido', inline: true }
        ]
      });
    } catch (error) {
      console.error('❌ Erro ao registrar criação de convite:', error);
    }
  }
};

// Função para formatar o tempo de expiração
function formatExpiryTime(seconds) {
  if (seconds === 0) return 'Nunca';
  
  if (seconds < 60) return `${seconds} segundos`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutos`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} horas`;
  return `${Math.floor(seconds / 86400)} dias`;
}