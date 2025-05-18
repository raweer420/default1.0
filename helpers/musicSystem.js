// helpers/musicSystem.js
const { DisTube } = require('distube');
const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

function setupMusicSystem(client) {
  try {
    console.log('🎵 Inicializando sistema de música com DisTube...');

    const ytdlpPath = process.env.YTDLP_PATH || path.join(__dirname, '..', 'ffmpeg', 'yt-dlp.exe');
    const ffmpegPath = process.env.FFMPEG_PATH || path.join(__dirname, '..', 'ffmpeg', 'ffmpeg.exe');

    console.log(`YT-DLP Path: ${ytdlpPath}`);
    console.log(`FFmpeg Path: ${ffmpegPath}`);

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

    let plugins = [];

    try {
      const { SpotifyPlugin } = require('@distube/spotify');
      plugins.push(new SpotifyPlugin()); // removido emitEventsAfterFetching
      console.log('✅ Plugin do Spotify carregado');
    } catch (error) {
      console.error('❌ Erro ao carregar plugin do Spotify:', error.message);
    }

    try {
      const { SoundCloudPlugin } = require('@distube/soundcloud');
      plugins.push(new SoundCloudPlugin());
      console.log('✅ Plugin do SoundCloud carregado');
    } catch (error) {
      console.error('❌ Erro ao carregar plugin do SoundCloud:', error.message);
    }

    try {
      const { YouTubePlugin } = require('@distube/youtube');
      plugins.push(new YouTubePlugin());
      console.log('✅ Plugin do YouTube carregado');
    } catch (error) {
      console.error('❌ Erro ao carregar plugin do YouTube:', error.message);
    }
    
    // Importante: Coloque o YtDlpPlugin por último na lista de plugins
    try {
      const { YtDlpPlugin } = require('@distube/yt-dlp');
      plugins.push(new YtDlpPlugin({
        update: false,
        executablePath: ytdlpPath  // Use executablePath em vez de path
      }));
      console.log('✅ Plugin do YtDlp carregado');
    } catch (error) {
      console.error('❌ Erro ao carregar plugin do YtDlp:', error.message);
    }

    // Remover opções obsoletas e manter apenas as suportadas
    const distube = new DisTube(client, {
      plugins: plugins,
      emitNewSongOnly: true
    });

    // Configuração para evento 'voiceStateUpdate' para substituir leaveOnEmpty
    client.on('voiceStateUpdate', (oldState, newState) => {
      // Se o bot está em um canal de voz e está sozinho
      const botMember = oldState.guild.members.me;
      if (botMember && botMember.voice.channel) {
        const botVoiceChannel = botMember.voice.channel;
        if (botVoiceChannel.members.size === 1) {
          console.log('Canal de voz vazio, desconectando...');
          const queue = distube.getQueue(oldState.guild.id);
          if (queue) {
            queue.textChannel.send('⚠️ Canal de voz vazio! Saindo do canal...');
            queue.voice.leave();
          }
        }
      }
    });

    distube
      .on('playSong', (queue, song) => {
        const embed = new EmbedBuilder()
          .setTitle('🎵 Tocando agora')
          .setDescription(`**${song.name}**`)
          .setThumbnail(song.thumbnail || null)
          .addFields(
            { name: 'Duração', value: song.formattedDuration, inline: true },
            { name: 'Solicitado por', value: `<@${song.user.id}>`, inline: true },
            { name: 'Fonte', value: song.source || 'YouTube', inline: true }
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
      // Atualização do evento 'error' conforme documentação
      .on('error', (e, queue, song) => {
        console.error('Erro no DisTube:', e);
        if (queue) {
          queue.textChannel.send(`❌ Erro ao reproduzir música: ${e.message || 'Erro desconhecido'}`);
        }
      })
      .on('empty', channel => {
        channel.send('⚠️ Canal de voz vazio! Saindo do canal...');
      })
      .on('finish', queue => {
        queue.textChannel.send('🏁 Não há mais músicas na fila!');
        // Implementação de leaveOnFinish
        // Se quiser que o bot saia do canal quando a fila terminar, descomente a linha abaixo
        // queue.voice.leave();
      })
      .on('disconnect', queue => {
        queue.textChannel.send('👋 Desconectado do canal de voz!');
      })
      .on('initQueue', queue => {
        queue.volume = 100;
        queue.autoplay = false;
      });

    console.log('✅ Sistema de música DisTube inicializado com sucesso!');
    return distube;

  } catch (error) {
    console.error('❌ Erro ao inicializar sistema de música DisTube:', error);
    return null;
  }
}

module.exports = setupMusicSystem;