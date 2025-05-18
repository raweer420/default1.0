const { Events } = require('discord.js');
const LogManager = require('../logger/logManager');

module.exports = {
  name: Events.MessageUpdate,
  async execute(client, oldMessage, newMessage) {
    // Ignorar mensagens de bots, DMs e mensagens embed sem conteúdo
    if (oldMessage.author?.bot || !oldMessage.guild || oldMessage.content === newMessage.content) return;
    
    try {
      await LogManager.sendLog(client, {
        title: '✏️ Mensagem Editada',
        color: 'Yellow',
        thumbnail: oldMessage.author?.displayAvatarURL(),
        fields: [
          { name: '👤 Autor', value: `${oldMessage.author?.tag} (${oldMessage.author?.id})`, inline: true },
          { name: '📝 Canal', value: `${oldMessage.channel.name} (<#${oldMessage.channel.id}>)`, inline: true },
          { name: '🔗 Ir para mensagem', value: `[Clique aqui](${newMessage.url})`, inline: true },
          { name: '📄 Conteúdo original', value: LogManager.truncate(oldMessage.content || '(sem conteúdo)') },
          { name: '📄 Novo conteúdo', value: LogManager.truncate(newMessage.content || '(sem conteúdo)') }
        ]
      });
    } catch (error) {
      console.error('❌ Erro ao registrar mensagem editada:', error);
    }
  }
};