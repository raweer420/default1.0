const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { YoutubeDLPlugin } = require('@distube/ytdl-core');
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
      }),
      new YoutubeDLPlugin() // <- Esse aqui é o essencial para o youtube funcionar
    ];

    // CRIA A INSTÂNCIA DO DISTUBE AQUI COM OS PLUGINS
    const distube = new DisTube(client, {
      plugins,
      emitNewSongOnly: true,
      leaveOnEmpty: true,
      // outras opções que quiser adicionar
    });

    // Seus eventos distube...
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
      //... resto dos eventos do seu código

    client.distube = distube;
    console.log('✅ Sistema de música DisTube inicializado com sucesso!');
    return distube;
  } catch (error) {
    console.error('❌ Erro ao inicializar sistema de música DisTube:', error);
    return null;
  }
}
