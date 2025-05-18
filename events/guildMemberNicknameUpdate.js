const { Events } = require('discord.js');
const LogManager = require('../logger/logManager');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(client, oldMember, newMember) {
    // Verifica se só o apelido mudou, não outros atributos
    if (oldMember.nickname === newMember.nickname) return;
    
    try {
      // Tentar obter o responsável pela mudança dos audit logs
      const auditLogs = await newMember.guild.fetchAuditLogs({
        type: 24, // MEMBER_UPDATE
        limit: 1
      });
      
      const nickLog = auditLogs.entries.first();
      
      // Só registrar se o log é recente (menos de 5 segundos)
      if (!nickLog || Date.now() - nickLog.createdTimestamp > 5000) return;
      
      // Verificar se o log é relacionado a este membro
      if (nickLog.target.id !== newMember.user.id) return;
      
      // Determinar se o usuário mudou o próprio apelido ou se foi um moderador
      const isSelf = newMember.user.id === nickLog.executor.id;
      const executor = nickLog.executor;
      
      await LogManager.sendLog(client, {
        title: '📝 Apelido Alterado',
        color: 'Blue',
        thumbnail: newMember.user.displayAvatarURL(),
        fields: [
          { name: '👤 Usuário', value: `${newMember.user.tag} (${newMember.user.id})`, inline: true },
          { name: '👮 Alterado por', value: isSelf ? 'Próprio usuário' : `${executor.tag} (${executor.id})`, inline: true },
          { name: '📅 Data', value: LogManager.formatTimestamp(Date.now()), inline: true },
          { name: '📝 Apelido anterior', value: oldMember.nickname || '(Sem apelido)', inline: true },
          { name: '📝 Novo apelido', value: newMember.nickname || '(Sem apelido)', inline: true }
        ]
      });
    } catch (error) {
      console.error('❌ Erro ao registrar alteração de apelido:', error);
    }
  }
};