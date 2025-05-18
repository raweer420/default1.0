const { Events } = require('discord.js');
const LogManager = require('../logger/logManager');

module.exports = {
  name: Events.MessageDelete,
  async execute(client, message) {
    // Ignorar mensagens de bots e DMs
    if (message.author?.bot || !message.guild) return;
    
    try {
      // Se a mensagem contém anexos, armazená-los
      let attachments = '';
      if (message.attachments.size > 0) {
        attachments = `\n\n**Anexos:**\n${message.attachments.map(a => a.url).join('\n')}`;
      }

      // Conteúdo da mensagem (se houver)
      const content = message.content ? message.content : '(mensagem sem texto)';

      await LogManager.sendLog(client, {
        title: '🗑️ Mensagem Apagada',
        color: 'Red',
        thumbnail: message.author?.displayAvatarURL(),
        fields: [
          { name: '👤 Autor', value: `${message.author?.tag} (${message.author?.id})`, inline: true },
          { name: '📝 Canal', value: `${message.channel.name} (<#${message.channel.id}>)`, inline: true },
          { name: '📅 Criada em', value: LogManager.formatTimestamp(message.createdTimestamp), inline: true },
          { name: '📄 Conteúdo', value: LogManager.truncate(content + attachments, 1024) }
        ]
      });
    } catch (error) {
      console.error('❌ Erro ao registrar mensagem apagada:', error);
    }
  }
};