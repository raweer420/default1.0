const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

/**
 * Configura o sistema de música utilizando DisTube
 * @param {Client} client - O cliente do Discord
 */
function setupMusicSystem(client) {
  try {
    console.log('🎵 Inicializando sistema de música com DisTube...');
    
    const ytdlpPath = process.env.YTDLP_PATH || path.join(__dirname, '..', 'ffmpeg', 'yt-dlp.exe');
    const ffmpegPath = process.env.FFMPEG_PATH || path.join(__dirname, '..', 'ffmpeg', 'ffmpeg.exe');

    if (fs.existsSync(ffmpegPath)) {
      console.log('✅ FFmpeg encontrado em:', ffmpegPath);
    } else {
      console.error('❌ FFmpeg não encontrado em:', ffmpegPath);
    }

    if (fs.existsSync(ytdlpPath)) {
      console.log('✅ yt-dlp encontrado em:', ytdlpPath);
    } else {
      console.error('❌ yt-dlp não encontrado em:', ytdlpPath);
    }

const plugins = [
  new SpotifyPlugin({
    api: {
      clientId: 'ce9512970b244441878e3877deab1d69',
      clientSecret: '6a17b72541604ba4905200648d790f0f'
    }
  }),
  new YtDlpPlugin({
    update: true,
    path: ytdlpPath
  })
];



    distube
      .on('playSong', (queue, song) => {
        const embed = new EmbedBuilder()
          .setTitle('🎵 Tocando agora')
          .setDescription(`**${song.name}**`)
          .setThumbnail(song.thumbnail || null)
          .addFields(
            { name: 'Duração', value: song.formattedDuration, inline: true },
            { name: 'Solicitado por', value: `<@${song.user.id}>`, inline: true },
            { name: 'Fonte', value: song.source, inline: true }
          )
          .setColor('#3498db');

        queue.textChannel.send({ embeds: [embed] });
      })
      .on('addSong', (queue, song) => {
        const embed = new EmbedBuilder()
          .setTitle('🎵 Música adicionada à fila')
          .setDescription(`**${song.name}**`)
          .setThumbnail(song.thumbnail || null)
          .addFields(
            { name: 'Duração', value: song.formattedDuration, inline: true },
            { name: 'Posição na fila', value: `${queue.songs.length}`, inline: true },
            { name: 'Solicitado por', value: `<@${song.user.id}>`, inline: true }
          )
          .setColor('#2ecc71');

        queue.textChannel.send({ embeds: [embed] });
      })
      .on('addList', (queue, playlist) => {
        const embed = new EmbedBuilder()
          .setTitle('🎵 Playlist adicionada à fila')
          .setDescription(`**${playlist.name}** - ${playlist.songs.length} músicas`)
          .setThumbnail(playlist.thumbnail || null)
          .addFields(
            { name: 'Duração', value: playlist.formattedDuration, inline: true },
            { name: 'Solicitado por', value: `<@${playlist.user.id}>`, inline: true }
          )
          .setColor('#9b59b6');

        queue.textChannel.send({ embeds: [embed] });
      })
      .on('error', (error, queue, song) => {
        console.error('Erro no DisTube:', error);
        if (queue && queue.textChannel) {
          queue.textChannel.send(`❌ Erro ao reproduzir música: ${error.message || 'Erro desconhecido'}`);
        }
      })
      .on('empty', channel => {
        channel.send('⚠️ Canal de voz vazio! Saindo do canal...');
      })
      .on('finish', queue => {
        queue.textChannel.send('🏁 Não há mais músicas na fila!');
        // Se quiser que o bot saia ao fim da fila:
        // queue.voice.leave();
      })
      .on('disconnect', queue => {
        queue.textChannel.send('👋 Desconectado do canal de voz!');
      })
      .on('noRelated', queue => {
        queue.textChannel.send('❌ Não foi possível encontrar músicas relacionadas para continuar tocando.');
      })
      .on('initQueue', queue => {
        queue.volume = 100;
        queue.autoplay = false;
      });

    client.distube = distube;
    console.log('✅ Sistema de música DisTube inicializado com sucesso!');
    return distube;
  } catch (error) {
    console.error('❌ Erro ao inicializar sistema de música DisTube:', error);
    return null;
  }
}

module.exports = setupMusicSystem;
