// commands/music/stop.js
module.exports = {
  name: 'stop',
  description: 'Para a reprodução de música e limpa a fila',
  aliases: ['leave', 'sair'],
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
      // Parar a música e limpar a fila
      await queue.stop();
      message.reply('⏹️ Reprodução parada e fila limpa!');
    } catch (error) {
      console.error('Erro ao parar música:', error);
      message.reply(`❌ Ocorreu um erro: ${error.message || 'Erro desconhecido'}`);
    }
  }
};