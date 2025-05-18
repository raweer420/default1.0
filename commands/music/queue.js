// commands/music/queue.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'queue',
  description: 'Mostra a fila de músicas atual',
  aliases: ['q', 'fila'],
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
    if (!queue || queue.songs.length === 0) {
      return message.reply('❌ Não há músicas na fila!');
    }
    
    try {
      // Criar embed para a fila
      const embed = new EmbedBuilder()
        .setTitle('🎵 Fila de Músicas')
        .setColor('#3498db');
      
      // Música atual
      const currentSong = queue.songs[0];
      embed.addFields({
        name: '🎧 Tocando agora',
        value: `**${currentSong.name}** - \`${currentSong.formattedDuration}\` - Pedido por: <@${currentSong.user.id}>`
      });
      
      // Próximas músicas (até 10)
      if (queue.songs.length > 1) {
        const queueList = queue.songs
          .slice(1, 11)
          .map((song, index) => `${index + 1}. **${song.name}** - \`${song.formattedDuration}\` - Pedido por: <@${song.user.id}>`)
          .join('\n');
        
        embed.addFields({
          name: '📋 Próximas músicas',
          value: queueList
        });
        
        // Se houver mais músicas além das 10 mostradas
        if (queue.songs.length > 11) {
          embed.addFields({
            name: '📢 E mais...',
            value: `Mais ${queue.songs.length - 11} músicas na fila`
          });
        }
      }
      
      // Informações adicionais
      embed.addFields([
        {
          name: '🔄 Loop',
          value: queue.repeatMode ? (queue.repeatMode === 1 ? 'Música atual' : 'Fila completa') : 'Desativado',
          inline: true
        },
        {
          name: '🔊 Volume',
          value: `${queue.volume}%`,
          inline: true
        },
        {
          name: '⏱️ Tempo restante',
          value: `\`${queue.formattedCurrentTime} / ${currentSong.formattedDuration}\``,
          inline: true
        }
      ]);
      
      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Erro ao exibir fila:', error);
      message.reply(`❌ Ocorreu um erro: ${error.message || 'Erro desconhecido'}`);
    }
  }
};