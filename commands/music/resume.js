// commands/music/resume.js

module.exports = {
  name: 'resume',
  description: 'Retoma a reprodução da música pausada',
  aliases: ['unpause', 'continue'],
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
      
      // Verificar se está pausado antes
      const player = client.musicManager.getPlayer ? client.musicManager.getPlayer(guildId) : null;
      if (player && player.state.status !== 'paused') {
        return message.reply('❌ A música não está pausada!');
      }
      
      // Retomar reprodução
      musicManager.pause(guildId); // Isso vai despausar se já estiver pausado
      
      await message.reply('▶️ Reprodução retomada!');
    } catch (error) {
      console.error('Erro ao executar comando resume:', error);
      message.reply(`❌ Ocorreu um erro: ${error.message || 'Erro desconhecido'}`);
    }
  }
};
