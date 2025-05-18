// commands/music/pause.js

module.exports = {
  name: 'pause',
  description: 'Pausa ou retoma a reprodução da música atual',
  aliases: ['resume'],
  category: 'Music',
  cooldown: 2,
  
  async execute(message, args, client) {
    // Verificar se o usuário está em um canal de voz
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply('❌ Você precisa estar em um canal de voz para usar este comando!');
    }
    
    try {
      // Usar o musicManager do cliente
      const musicManager = client.musicManager;
      
      if (!musicManager) {
        return message.reply('❌ Sistema de música não está funcionando corretamente.');
      }
      
      const guildId = message.guild.id;
      const queue = musicManager.getQueue(guildId);
      
      if (!queue || !queue.playing) {
        return message.reply('❌ Não há nada tocando no momento!');
      }
      
      // Pausar ou retomar
      const isPaused = musicManager.pause(guildId);
      
      if (isPaused) {
        await message.reply('⏸️ Música pausada!');
      } else {
        await message.reply('▶️ Reprodução retomada!');
      }
    } catch (error) {
      console.error('Erro ao executar comando pause:', error);
      message.reply(`❌ Ocorreu um erro: ${error.message || 'Erro desconhecido'}`);
    }
  }
};