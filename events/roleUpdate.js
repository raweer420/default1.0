const { Events } = require('discord.js');
const LogManager = require('../logger/logManager');

module.exports = {
  name: Events.GuildRoleUpdate,
  async execute(client, oldRole, newRole) {
    try {
      // Tentar obter quem modificou o cargo
      const auditLogs = await newRole.guild.fetchAuditLogs({
        type: 31, // ROLE_UPDATE
        limit: 1
      });
      
      const roleLog = auditLogs.entries.first();
      
      // Verifique se o audit log é recente (menos de 5 segundos)
      if (!roleLog || Date.now() - roleLog.createdTimestamp > 5000) return;
      
      const updater = roleLog.executor;
      
      // Verificar o que foi alterado
      const changes = [];
      
      // Nome do cargo
      if (oldRole.name !== newRole.name) {
        changes.push({
          name: '📝 Nome',
          value: `\`${oldRole.name}\` → \`${newRole.name}\``
        });
      }
      
      // Cor do cargo
      if (oldRole.hexColor !== newRole.hexColor) {
        changes.push({
          name: '🎨 Cor',
          value: `\`${oldRole.hexColor}\` → \`${newRole.hexColor}\``
        });
      }
      
      // Permissões do cargo (simplificado para não ficar muito extenso)
      if (!oldRole.permissions.equals(newRole.permissions)) {
        const oldPerms = oldRole.permissions.toArray();
        const newPerms = newRole.permissions.toArray();
        
        const addedPerms = newPerms.filter(perm => !oldPerms.includes(perm));
        const removedPerms = oldPerms.filter(perm => !newPerms.includes(perm));
        
        if (addedPerms.length > 0) {
          changes.push({
            name: '➕ Permissões Adicionadas',
            value: `\`${addedPerms.join(', ')}\``
          });
        }
        
        if (removedPerms.length > 0) {
          changes.push({
            name: '➖ Permissões Removidas',
            value: `\`${removedPerms.join(', ')}\``
          });
        }
      }
      
      // Mencionável
      if (oldRole.mentionable !== newRole.mentionable) {
        changes.push({
          name: '🏁 Mencionável',
          value: `\`${oldRole.mentionable ? 'Sim' : 'Não'}\` → \`${newRole.mentionable ? 'Sim' : 'Não'}\``
        });
      }
      
      // Mostrado separadamente
      if (oldRole.hoist !== newRole.hoist) {
        changes.push({
          name: '📌 Mostrado Separadamente',
          value: `\`${oldRole.hoist ? 'Sim' : 'Não'}\` → \`${newRole.hoist ? 'Sim' : 'Não'}\``
        });
      }
      
      // Posição
      if (oldRole.position !== newRole.position) {
        changes.push({
          name: '📊 Posição',
          value: `\`${oldRole.position}\` → \`${newRole.position}\``
        });
      }
      
      // Se nenhuma alteração rastreada foi feita, sair
      if (changes.length === 0) return;
      
      // Montar os campos do embed
      const fields = [
        { name: '🏷️ Cargo', value: `${newRole.name} (<@&${newRole.id}>)`, inline: true },
        { name: '🆔 ID', value: newRole.id, inline: true },
        { name: '👮 Atualizado por', value: `${updater.tag} (${updater.id})`, inline: true },
        { name: '📅 Data', value: LogManager.formatTimestamp(Date.now()), inline: false }
      ];
      
      // Adicionar as alterações aos campos
      fields.push(...changes);
      
      await LogManager.sendLog(client, {
        title: '🔄 Cargo Atualizado',
        color: 'Blue',
        fields: fields
      });
    } catch (error) {
      console.error('❌ Erro ao registrar atualização de cargo:', error);
    }
  }
};