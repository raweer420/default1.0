// commands/music/loop.js

module.exports = {
  name: 'loop',
  description: 'Ativa ou desativa o modo de repetição',
  aliases: ['repeat'],
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
      
      // Alternar modo de loop
      const isLoop = musicManager.toggleLoop(guildId);
      
      if (isLoop) {
        await message.reply('🔁 Modo de repetição **ativado**!');
      } else {
        await message.reply('➡️ Modo de repetição **desativado**!');
      }
    } catch (error) {
      console.error('Erro ao executar comando loop:', error);
      message.reply(`❌ Ocorreu um erro: ${error.message || 'Erro desconhecido'}`);
    }
  }
};
