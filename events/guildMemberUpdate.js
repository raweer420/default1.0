const { Events } = require('discord.js');
const LogManager = require('../logger/logManager');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(client, oldMember, newMember) {
    try {
      // Verificar mudanças de cargo
      if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
        const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
        const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
        
        // Se o usuário recebeu novos cargos
        if (addedRoles.size > 0) {
          // Tenta obter o responsável pela mudança dos audit logs
          const auditLogs = await newMember.guild.fetchAuditLogs({
            type: 25, // MEMBER_ROLE_UPDATE
            limit: 1
          });
          
          const roleLog = auditLogs.entries.first();
          const moderator = (roleLog && Date.now() - roleLog.createdTimestamp < 5000 && roleLog.target.id === newMember.id)
            ? roleLog.executor
            : { tag: 'Sistema ou desconhecido', id: 'Desconhecido' };
            
          await LogManager.sendLog(client, {
            title: '📝 Cargo Adicionado',
            color: 'Green',
            thumbnail: newMember.user.displayAvatarURL(),
            fields: [
              { name: '👤 Membro', value: `${newMember.user.tag} (${newMember.user.id})`, inline: true },
              { name: '👮 Moderador', value: `${moderator.tag} (${moderator.id})`, inline: true },
              { name: '📅 Data', value: LogManager.formatTimestamp(Date.now()), inline: true },
              { name: '🏷️ Cargos Adicionados', value: addedRoles.map(r => `<@&${r.id}>`).join(', ') }
            ]
          });
        }
        
        // Se o usuário perdeu cargos
        if (removedRoles.size > 0) {
          // Tenta obter o responsável pela mudança dos audit logs
          const auditLogs = await newMember.guild.fetchAuditLogs({
            type: 25, // MEMBER_ROLE_UPDATE
            limit: 1
          });
          
          const roleLog = auditLogs.entries.first();
          const moderator = (roleLog && Date.now() - roleLog.createdTimestamp < 5000 && roleLog.target.id === newMember.id)
            ? roleLog.executor
            : { tag: 'Sistema ou desconhecido', id: 'Desconhecido' };
            
          await LogManager.sendLog(client, {
            title: '📝 Cargo Removido',
            color: 'Orange',
            thumbnail: newMember.user.displayAvatarURL(),
            fields: [
              { name: '👤 Membro', value: `${newMember.user.tag} (${newMember.user.id})`, inline: true },
              { name: '👮 Moderador', value: `${moderator.tag} (${moderator.id})`, inline: true },
              { name: '📅 Data', value: LogManager.formatTimestamp(Date.now()), inline: true },
              { name: '🏷️ Cargos Removidos', value: removedRoles.map(r => `<@&${r.id}>`).join(', ') }
            ]
          });
        }
      }
      
      // Verificar mudanças de apelido (nickname)
      if (oldMember.nickname !== newMember.nickname) {
        // Tenta obter o responsável pela mudança dos audit logs
        const auditLogs = await newMember.guild.fetchAuditLogs({
          type: 24, // MEMBER_UPDATE
          limit: 1
        });
        
        const nicknameLog = auditLogs.entries.first();
        const isSelf = newMember.user.id === nicknameLog?.executor?.id;
        const moderator = (nicknameLog && Date.now() - nicknameLog.createdTimestamp < 5000 && nicknameLog.target.id === newMember.id)
          ? nicknameLog.executor
          : { tag: 'Sistema ou desconhecido', id: 'Desconhecido' };
          
        await LogManager.sendLog(client, {
          title: '📝 Apelido Alterado',
          color: 'Blue',
          thumbnail: newMember.user.displayAvatarURL(),
          fields: [
            { name: '👤 Membro', value: `${newMember.user.tag} (${newMember.user.id})`, inline: true },
            { name: '👮 Alterado por', value: isSelf ? 'Próprio usuário' : `${moderator.tag} (${moderator.id})`, inline: true },
            { name: '📅 Data', value: LogManager.formatTimestamp(Date.now()), inline: true },
            { name: '📝 Apelido Anterior', value: oldMember.nickname || '(Sem apelido)' },
            { name: '📝 Novo Apelido', value: newMember.nickname || '(Sem apelido)' }
          ]
        });
      }
      
      // Verificar mudanças de timeout (mute temporário)
      if (!oldMember.communicationDisabledUntil && newMember.communicationDisabledUntil) {
        // Tenta obter o responsável pela mudança dos audit logs
        const auditLogs = await newMember.guild.fetchAuditLogs({
          type: 24, // MEMBER_UPDATE
          limit: 1
        });
        
        const timeoutLog = auditLogs.entries.first();
        const moderator = (timeoutLog && Date.now() - timeoutLog.createdTimestamp < 5000 && timeoutLog.target.id === newMember.id)
          ? timeoutLog.executor
          : { tag: 'Sistema ou desconhecido', id: 'Desconhecido' };
          
        const timeoutUntil = Math.floor(newMember.communicationDisabledUntil.getTime() / 1000);
        const timeoutDuration = Math.floor((newMember.communicationDisabledUntil.getTime() - Date.now()) / 1000 / 60);
        
        await LogManager.sendLog(client, {
          title: '🔇 Membro Silenciado (Timeout)',
          color: 'Red',
          thumbnail: newMember.user.displayAvatarURL(),
          fields: [
            { name: '👤 Membro', value: `${newMember.user.tag} (${newMember.user.id})`, inline: true },
            { name: '👮 Moderador', value: `${moderator.tag} (${moderator.id})`, inline: true },
            { name: '⏱️ Duração', value: `${timeoutDuration} minutos`, inline: true },
            { name: '⏰ Expira em', value: `<t:${timeoutUntil}:F> (<t:${timeoutUntil}:R>)` }
          ]
        });
      } else if (oldMember.communicationDisabledUntil && !newMember.communicationDisabledUntil) {
        // Timeout removido
        const auditLogs = await newMember.guild.fetchAuditLogs({
          type: 24, // MEMBER_UPDATE
          limit: 1
        });
        
        const timeoutLog = auditLogs.entries.first();
        const moderator = (timeoutLog && Date.now() - timeoutLog.createdTimestamp < 5000 && timeoutLog.target.id === newMember.id)
          ? timeoutLog.executor
          : { tag: 'Sistema ou desconhecido', id: 'Desconhecido' };
          
        await LogManager.sendLog(client, {
          title: '🔊 Timeout Removido',
          color: 'Green',
          thumbnail: newMember.user.displayAvatarURL(),
          fields: [
            { name: '👤 Membro', value: `${newMember.user.tag} (${newMember.user.id})`, inline: true },
            { name: '👮 Moderador', value: `${moderator.tag} (${moderator.id})`, inline: true },
            { name: '📅 Data', value: LogManager.formatTimestamp(Date.now()), inline: true }
          ]
        });
      }
      
    } catch (error) {
      console.error('❌ Erro ao registrar atualização de membro:', error);
    }
  }
};