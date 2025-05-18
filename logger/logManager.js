const { EmbedBuilder } = require('discord.js');
const { LOG_CHANNEL_ID } = require('../config');

class LogManager {
  /**
   * Envia um log para o canal designado
   * @param {Client} client Cliente do Discord
   * @param {Object} options Opções do log
   */
  static async sendLog(client, options) {
    try {
      // Verificar se LOGs estão ativados
      if (!LOG_CHANNEL_ID || LOG_CHANNEL_ID.trim() === '') {
        return;
      }
      
      // Verificar estado do cliente
      if (!client || !client.isReady()) {
        console.error('❌ [LOG] Cliente do Discord não está pronto');
        return;
      }
      
      // Buscar o canal com tratamento de erro
      let logChannel;
      try {
        logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
      } catch (fetchError) {
        console.error('❌ [LOG] Erro ao buscar canal de logs:', fetchError);
        return;
      }
      
      // Verificações do canal
      if (!logChannel) {
        console.error(`❌ [LOG] Canal de logs não encontrado. Verifique o ID: ${LOG_CHANNEL_ID}`);
        return;
      }
      
      // Verificar permissões de envio
      const botMember = logChannel.guild.members.me;
      const permissions = logChannel.permissionsFor(botMember);
      
      if (!permissions.has('SendMessages') || !permissions.has('EmbedLinks')) {
        console.error('❌ [LOG] O bot não tem permissões completas no canal de logs');
        return;
      }

      // Converter opções de cor em códigos hexadecimais
      const colorMap = {
        'Red': '#FF5555',
        'Green': '#55FF55',
        'Blue': '#5555FF',
        'Yellow': '#FFFF55',
        'Orange': '#FFAA00',
        'Purple': '#AA00AA',
        'Grey': '#AAAAAA',
        'DarkRed': '#AA0000'
      };
      
      const hexColor = colorMap[options.color] || options.color || '#3498db';

      // Criar embed
      const embed = new EmbedBuilder()
        .setTitle(options.title || 'Log')
        .setColor(hexColor)
        .setTimestamp();

      // Adicionar descrição se fornecida
      if (options.description) {
        embed.setDescription(this.truncate(options.description, 4096));
      }

      // Adicionar thumbnail
      if (options.thumbnail) {
        embed.setThumbnail(options.thumbnail);
      }

      // Adicionar imagem
      if (options.image) {
        embed.setImage(options.image);
      }

      // Adicionar rodapé
      if (options.footer) {
        embed.setFooter({ 
          text: this.truncate(options.footer, 2048),
          iconURL: options.footerIcon || null
        });
      } else {
        // Rodapé padrão com ID do servidor e timestamp
        embed.setFooter({
          text: `Servidor: ${logChannel.guild.name} • ID: ${logChannel.guild.id}`,
          iconURL: logChannel.guild.iconURL({ dynamic: true })
        });
      }
      
      // Processar campos com truncagem e limite
      if (options.fields && options.fields.length > 0) {
        const processedFields = options.fields.map(field => ({
          name: this.truncate(field.name, 256),
          value: this.truncate(field.value || 'N/A', 1024),
          inline: field.inline || false
        })).slice(0, 25); // Limite de 25 campos por embed
        
        embed.addFields(processedFields);
      }

      // Enviar embed no canal de logs
      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error('❌ [LOG] Erro crítico no sistema de logs:', error);
    }
  }

  /**
   * Trunca texto muito longo para evitar erros nos embeds
   * @param {String} text Texto a ser truncado
   * @param {Number} maxLength Tamanho máximo
   * @returns {String} Texto truncado
   */
  static truncate(text, maxLength = 1024) {
    if (!text) return 'N/A';
    return text.length > maxLength ? `${text.substring(0, maxLength - 3)}...` : text;
  }

  /**
   * Formata uma data em timestamp do Discord
   * @param {Date|Number} date Data ou timestamp
   * @returns {String} Timestamp formatado
   */
  static formatTimestamp(date) {
    const timestamp = date instanceof Date ? Math.floor(date.getTime() / 1000) : Math.floor(date / 1000);
    return `<t:${timestamp}:F> (<t:${timestamp}:R>)`;
  }

  /**
   * Registra erro crítico no console e no canal de logs
   * @param {Client} client Cliente do Discord
   * @param {Error} error Erro a ser registrado
   * @param {String} context Contexto do erro
   */
  static async logCriticalError(client, error, context = 'Sistema') {
    console.error(`❌ [CRITICAL ERROR] ${context}:`, error);

    // Enviar log de erro
    await this.sendLog(client, {
      title: '🚨 Erro Crítico do Sistema',
      color: 'Red',
      description: `**Contexto:** ${context}\n**Erro:** \`${error.message}\``,
      fields: [
        { 
          name: '📌 Detalhes', 
          value: this.truncate(error.stack || 'Sem stack trace', 1024) 
        }
      ],
      footer: `Erro registrado em ${new Date().toISOString()}`
    });
  }
  
  /**
   * Registra uma ação tomada por um moderador
   * @param {Client} client Cliente do Discord
   * @param {Object} options Opções do log de moderação
   */
  static async logModAction(client, options) {
    const { moderator, target, action, reason, duration } = options;
    
    await this.sendLog(client, {
      title: `🛡️ Ação de Moderação: ${action}`,
      color: 'DarkRed',
      thumbnail: target.displayAvatarURL ? target.displayAvatarURL() : null,
      fields: [
        { name: '👤 Usuário', value: `${target.tag || target.user?.tag} (${target.id})`, inline: true },
        { name: '👮 Moderador', value: `${moderator.tag} (${moderator.id})`, inline: true },
        { name: '📅 Data', value: this.formatTimestamp(Date.now()), inline: true },
        ...(duration ? [{ name: '⏱️ Duração', value: duration, inline: true }] : []),
        { name: '📝 Motivo', value: reason || 'Nenhum motivo fornecido' }
      ]
    });
  }
  
  /**
   * Verifica se há um log de auditoria recente para uma ação específica
   * @param {Guild} guild Servidor do Discord
   * @param {Number} actionType Tipo de ação (número do evento de auditoria)
   * @param {Object} targetId ID do alvo da ação (opcional)
   * @returns {Promise<AuditLogEntry|null>} Entrada do log de auditoria ou null
   */
  static async getRecentAuditLog(guild, actionType, targetId = null) {
    try {
      const auditLogs = await guild.fetchAuditLogs({
        type: actionType,
        limit: 5
      });
      
      // Filtrar logs recentes (últimos 5 segundos)
      const recentLog = auditLogs.entries.find(entry => {
        const isRecent = Date.now() - entry.createdTimestamp < 5000;
        const isTarget = targetId ? entry.target.id === targetId : true;
        return isRecent && isTarget;
      });
      
      return recentLog || null;
    } catch (error) {
      console.error(`❌ Erro ao buscar logs de auditoria (tipo ${actionType}):`, error);
      return null;
    }
  }
}

module.exports = LogManager;