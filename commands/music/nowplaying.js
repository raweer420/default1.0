// commands/music/nowplaying.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'nowplaying',
  description: 'Mostra informações sobre a música atual',
  aliases: ['np', 'current', 'tocando'],
  category: 'Music',
  cooldown: 3,
  
  async execute(message, args, client) {
    try {
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
      if (!queue || !queue.songs[0]) {
        return message.reply('❌ Não há nada tocando no momento!');
      }
      
      // Obter a música atual
      const song = queue.songs[0];
      
      // Calcular a barra de progresso
      const currentTime = queue.currentTime;
      const duration = song.duration;
      const progress = createProgressBar(currentTime, duration);
      
      // Criar embed
      const embed = new EmbedBuilder()
        .setTitle('🎵 Tocando Agora')
        .setDescription(`**${song.name}**`)
        .setURL(song.url)
        .setThumbnail(song.thumbnail)
        .addFields(
          { name: 'Duração', value: `\`${queue.formattedCurrentTime} / ${song.formattedDuration}\`\n${progress}`, inline: false },
          { name: 'Solicitado por', value: `<@${song.user.id}>`, inline: true },
          { name: 'Artista', value: song.uploader?.name || 'Desconhecido', inline: true },
          { name: 'Volume', value: `${queue.volume}%`, inline: true }
        )
        .setColor('#3498db')
        .setFooter({ text: `Loop: ${queue.repeatMode ? (queue.repeatMode === 1 ? 'Música' : 'Fila') : 'Desativado'} | Fonte: ${song.source}` });
      
      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Erro ao executar comando nowplaying:', error);
      message.reply(`❌ Ocorreu um erro: ${error.message || 'Erro desconhecido'}`);
    }
  }
};

/**
 * Cria uma barra de progresso visual
 * @param {number} current - Tempo atual em segundos
 * @param {number} total - Duração total em segundos
 * @returns {string} Barra de progresso
 */
function createProgressBar(current, total) {
  if (isNaN(current) || isNaN(total)) return '`[--:--]`';
  
  const size = 15;
  const percent = Math.round((current / total) * 100);
  const filledSize = Math.round(size * (current / total));
  const emptySize = size - filledSize;
  
  const filledBar = '▓'.repeat(filledSize);
  const emptyBar = '░'.repeat(emptySize);
  
  return `\`[${filledBar}${emptyBar}]\` ${percent}%`;
}