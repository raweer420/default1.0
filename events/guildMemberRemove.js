const { Events } = require('discord.js');
const LogManager = require('../logger/logManager');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(client, member) {
    try {
      // Verificar se o membro foi expulso ou banido através dos audit logs
      const kickAuditLogs = await member.guild.fetchAuditLogs({
        type: 20, // MEMBER_KICK
        limit: 1
      });
      
      const banAuditLogs = await member.guild.fetchAuditLogs({
        type: 22, // MEMBER_BAN_ADD
        limit: 1
      });
      
      const kickLog = kickAuditLogs.entries.first();
      const banLog = banAuditLogs.entries.first();
      
      // Verificar se o kick/ban é recente (menos de 5 segundos) e se refere ao mesmo membro
      const isKicked = kickLog && 
                      Date.now() - kickLog.createdTimestamp < 5000 && 
                      kickLog.target.id === member.user.id;
                      
      const isBanned = banLog && 
                      Date.now() - banLog.createdTimestamp < 5000 && 
                      banLog.target.id === member.user.id;
      
      // Se o membro foi banido, não registrar como saída normal
      if (isBanned) return;
      
      // Se o membro foi expulso
      if (isKicked) {
        const moderator = kickLog.executor;
        const reason = kickLog.reason || 'Nenhum motivo fornecido';
        
        await LogManager.sendLog(client, {
          title: '👢 Membro Expulso',
          color: 'Orange',
          thumbnail: member.user.displayAvatarURL(),
          fields: [
            { name: '👤 Usuário', value: `${member.user.tag} (${member.user.id})`, inline: true },
            { name: '👮 Moderador', value: `${moderator.tag} (${moderator.id})`, inline: true },
            { name: '📅 Data', value: LogManager.formatTimestamp(Date.now()), inline: true },
            { name: '📝 Motivo', value: reason }
          ]
        });
        return;
      }
      
      // Se foi uma saída normal (não kick/ban)
      await LogManager.sendLog(client, {
        title: '👋 Membro Saiu',
        color: 'Grey',
        thumbnail: member.user.displayAvatarURL(),
        fields: [
          { name: '👤 Usuário', value: `${member.user.tag} (${member.user.id})`, inline: true },
          { name: '🤖 Bot?', value: member.user.bot ? 'Sim' : 'Não', inline: true },
          { name: '📅 Saiu em', value: LogManager.formatTimestamp(Date.now()), inline: true },
          { name: '🗓️ Entrou em', value: member.joinedAt ? LogManager.formatTimestamp(member.joinedAt) : 'Desconhecido', inline: true },
          { name: '⏱️ Tempo no servidor', value: member.joinedAt ? formatDuration(Date.now() - member.joinedAt.getTime()) : 'Desconhecido', inline: true },
          { name: '🔢 Membros restantes', value: `${member.guild.memberCount}`, inline: true }
        ]
      });
    } catch (error) {
      console.error('❌ Erro ao registrar saída de membro:', error);
    }
  }
};

// Função auxiliar para formatar a duração
function formatDuration(duration) {
  const seconds = Math.floor(duration / 1000) % 60;
  const minutes = Math.floor(duration / (1000 * 60)) % 60;
  const hours = Math.floor(duration / (1000 * 60 * 60)) % 24;
  const days = Math.floor(duration / (1000 * 60 * 60 * 24));
  
  if (days > 0) {
    return `${days} dia${days !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hora${hours !== 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  } else {
    return `${seconds} segundo${seconds !== 1 ? 's' : ''}`;
  }
}