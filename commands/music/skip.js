// commands/music/skip.js
module.exports = {
  name: 'skip',
  description: 'Pula a música atual',
  aliases: ['s', 'next'],
  category: 'Music',
  
  async execute(message, args, client) {
    // Verificar se o usuário está em um canal de voz
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply('❌ Você precisa estar em um canal de voz para usar este comando!');
    }
    
    // Verificar se o cliente tem o DisTube
    if (!client.distube) {
      return message.reply('❌ Sistema de música não está funcionando corretamente.');
    }
    
    // Obter a fila do servidor
    const queue = client.distube.getQueue(message.guildId);
    if (!queue) {
      return message.reply('❌ Não há nada tocando no momento!');
    }
    
    try {
      // Pular a música atual
      await queue.skip();
      message.reply('⏭️ Música pulada!');
    } catch (error) {
      console.error('Erro ao pular música:', error);
      
      if (error.message === 'Não há música para pular.') {
        message.reply('❌ Não há próxima música na fila!');
      } else {
        message.reply(`❌ Ocorreu um erro: ${error.message || 'Erro desconhecido'}`);
      }
    }
  }
};