// commands/music/nowplaying.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'nowplaying',
  description: 'Mostra informações sobre a música atual',
  aliases: ['np', 'current'],
  category: 'Music',
  cooldown: 3,
  
  async execute(message, args, client) {
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
      
      // Obter a música atual
      const currentSong = musicManager.getNowPlaying(guildId);
      if (!currentSong) {
        return message.reply('❌ Não foi possível obter informações da música atual.');
      }
      
      // Criar embed
      const embed = new EmbedBuilder()
        .setTitle('🎵 Tocando Agora')
        .setDescription(`**${currentSong.title}**`)
        .setThumbnail(currentSong.thumbnail || null)
        .addFields(
          { name: 'Duração', value: musicManager.formatDuration(currentSong.duration), inline: true },
          { name: 'Solicitado por', value: currentSong.requestedBy, inline: true },
          { name: 'Loop', value: queue.loop ? 'Ativado ✅' : 'Desativado ❌', inline: true }
        )
        .setColor('#3498db')
        .setFooter({ text: `Use ${message.client.config?.PREFIX || '!'}queue para ver toda a fila` });
      
      // Adicionar URL, se disponível
      if (currentSong.url) {
        embed.setURL(currentSong.url);
      }
      
      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Erro ao executar comando nowplaying:', error);
      message.reply(`❌ Ocorreu um erro: ${error.message || 'Erro desconhecido'}`);
    }
  }
};
