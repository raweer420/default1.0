const { Events } = require('discord.js');
const LogManager = require('../logger/logManager');

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(client, oldState, newState) {
    // Ignorar bots
    if (oldState.member.user.bot) return;
    
    const member = oldState.member || newState.member;
    
    try {
      // Verificar logs de auditoria para ações de voz
      const getVoiceAuditLog = async () => {
        try {
          // Buscar logs de auditoria relacionados a ações de voz (ID 26 = MEMBER_MOVE, ID 24 = MEMBER_UPDATE para mute/deafen)
          const auditLogs = await newState.guild.fetchAuditLogs({
            limit: 5, // Verificamos os últimos 5 logs para encontrar o relevante
            type: 24 // MEMBER_UPDATE (inclui mute/deafen)
          });
          
          // Verificar também logs de movimentação de membros
          const moveAuditLogs = await newState.guild.fetchAuditLogs({
            limit: 5,
            type: 26 // MEMBER_MOVE
          });
          
          // Combinar os logs para análise
          const combinedLogs = [...auditLogs.entries.values(), ...moveAuditLogs.entries.values()]
            .sort((a, b) => b.createdTimestamp - a.createdTimestamp); // Ordenar por mais recente
          
          // Filtrar logs relevantes (recentes e relacionados ao usuário atual)
          const relevantLog = combinedLogs.find(log => {
            // Verificar se o log é recente (menos de 5 segundos)
            const isRecent = Date.now() - log.createdTimestamp < 5000;
            // Verificar se o log está relacionado ao usuário atual
            const isRelatedToUser = log.target && log.target.id === member.id;
            return isRecent && isRelatedToUser;
          });
          
          return relevantLog;
        } catch (err) {
          console.error('Erro ao buscar logs de auditoria:', err);
          return null;
        }
      };
      
      // Recuperar log de auditoria (apenas uma vez para evitar múltiplas chamadas)
      const auditLog = await getVoiceAuditLog();
      const actionExecutor = auditLog?.executor;
      
      // 1. Entrou em um canal de voz
      if (!oldState.channelId && newState.channelId) {
        await LogManager.sendLog(client, {
          title: '🎙️ Entrou em Canal de Voz',
          color: 'Green',
          thumbnail: member.user.displayAvatarURL(),
          fields: [
            { name: '👤 Usuário', value: `${member.user.tag} (${member.user.id})`, inline: true },
            { name: '🔊 Canal', value: `${newState.channel.name} (<#${newState.channelId}>)`, inline: true },
            { name: '⏰ Horário', value: LogManager.formatTimestamp(Date.now()), inline: true }
          ]
        });
      }
      
      // 2. Saiu de um canal de voz
      else if (oldState.channelId && !newState.channelId) {
        await LogManager.sendLog(client, {
          title: '🎙️ Saiu do Canal de Voz',
          color: 'Red',
          thumbnail: member.user.displayAvatarURL(),
          fields: [
            { name: '👤 Usuário', value: `${member.user.tag} (${member.user.id})`, inline: true },
            { name: '🔊 Canal', value: `${oldState.channel.name} (<#${oldState.channelId}>)`, inline: true },
            { name: '⏰ Horário', value: LogManager.formatTimestamp(Date.now()), inline: true }
          ]
        });
      }
      
      // 3. Moveu-se entre canais de voz (ou foi movido)
      else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        // Verificar se foi movido por algum moderador ou se moveu por conta própria
        const wasMoved = actionExecutor && actionExecutor.id !== member.id;
        
        await LogManager.sendLog(client, {
          title: wasMoved ? '🎙️ Movido Entre Canais de Voz' : '🎙️ Moveu-se Entre Canais de Voz',
          color: 'Blue',
          thumbnail: member.user.displayAvatarURL(),
          fields: [
            { name: '👤 Usuário', value: `${member.user.tag} (${member.user.id})`, inline: true },
            // Se foi movido por alguém, mostrar quem moveu
            ...(wasMoved ? [{ name: '👮 Movido por', value: `${actionExecutor.tag} (${actionExecutor.id})`, inline: true }] : []),
            { name: '🔊 De', value: `${oldState.channel.name} (<#${oldState.channelId}>)`, inline: true },
            { name: '🔊 Para', value: `${newState.channel.name} (<#${newState.channelId}>)`, inline: true },
            { name: '⏰ Horário', value: LogManager.formatTimestamp(Date.now()), inline: false }
          ]
        });
      }
      
      // 4. Alterou estado de mudo
      if (oldState.mute !== newState.mute) {
        // Verificar se foi mutado pelo servidor ou por si mesmo
        const isServerMute = newState.serverMute !== oldState.serverMute;
        const status = newState.mute ? 'Mutado' : 'Desmutado';
        
        // Verificar quem executou a ação (se foi um moderador ou o próprio usuário)
        const isSelfAction = !actionExecutor || actionExecutor.id === member.id;
        const muteType = isServerMute 
          ? (isSelfAction ? 'pelo próprio usuário' : `pelo moderador ${actionExecutor.tag}`) 
          : (isSelfAction ? 'pelo próprio usuário' : `pelo servidor`);
        
        await LogManager.sendLog(client, {
          title: `🎙️ ${status} Microfone`,
          color: newState.mute ? 'Orange' : 'Green',
          thumbnail: member.user.displayAvatarURL(),
          fields: [
            { name: '👤 Usuário', value: `${member.user.tag} (${member.user.id})`, inline: true },
            { name: '🔊 Canal', value: `${newState.channel.name} (<#${newState.channelId}>)`, inline: true },
            { name: '📌 Ação', value: `${status} ${muteType}`, inline: true },
            { name: '⏰ Horário', value: LogManager.formatTimestamp(Date.now()), inline: true }
          ]
        });
      }
      
      // 5. Alterou estado de silenciado
      if (oldState.deaf !== newState.deaf) {
        const isServerDeaf = newState.serverDeaf !== oldState.serverDeaf;
        const status = newState.deaf ? 'Silenciado' : 'Dessilenciado';
        
        // Verificar quem executou a ação
        const isSelfAction = !actionExecutor || actionExecutor.id === member.id;
        const deafType = isServerDeaf 
          ? (isSelfAction ? 'pelo próprio usuário' : `pelo moderador ${actionExecutor.tag}`) 
          : (isSelfAction ? 'pelo próprio usuário' : `pelo servidor`);
        
        await LogManager.sendLog(client, {
          title: `🎙️ ${status} Áudio`,
          color: newState.deaf ? 'Orange' : 'Green',
          thumbnail: member.user.displayAvatarURL(),
          fields: [
            { name: '👤 Usuário', value: `${member.user.tag} (${member.user.id})`, inline: true },
            { name: '🔊 Canal', value: `${newState.channel.name} (<#${newState.channelId}>)`, inline: true },
            { name: '📌 Ação', value: `${status} ${deafType}`, inline: true },
            { name: '⏰ Horário', value: LogManager.formatTimestamp(Date.now()), inline: true }
          ]
        });
      }
      
      // 6. Iniciou/Parou transmissão
      if (oldState.streaming !== newState.streaming) {
        const status = newState.streaming ? 'Iniciou' : 'Encerrou';
        
        await LogManager.sendLog(client, {
          title: `🎙️ ${status} Transmissão`,
          color: newState.streaming ? 'Purple' : 'Grey',
          thumbnail: member.user.displayAvatarURL(),
          fields: [
            { name: '👤 Usuário', value: `${member.user.tag} (${member.user.id})`, inline: true },
            { name: '🔊 Canal', value: `${newState.channel.name} (<#${newState.channelId}>)`, inline: true },
            { name: '⏰ Horário', value: LogManager.formatTimestamp(Date.now()), inline: true }
          ]
        });
      }
      
      // 7. Iniciou/Parou vídeo
      if (oldState.selfVideo !== newState.selfVideo) {
        const status = newState.selfVideo ? 'Ligou' : 'Desligou';
        
        await LogManager.sendLog(client, {
          title: `🎙️ ${status} Vídeo`,
          color: newState.selfVideo ? 'Purple' : 'Grey',
          thumbnail: member.user.displayAvatarURL(),
          fields: [
            { name: '👤 Usuário', value: `${member.user.tag} (${member.user.id})`, inline: true },
            { name: '🔊 Canal', value: `${newState.channel.name} (<#${newState.channelId}>)`, inline: true },
            { name: '⏰ Horário', value: LogManager.formatTimestamp(Date.now()), inline: true }
          ]
        });
      }
      
    } catch (error) {
      console.error('❌ Erro ao registrar eventos de voz:', error);
    }
  }
};