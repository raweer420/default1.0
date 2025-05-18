const { createAudioPlayer, createAudioResource, AudioPlayerStatus, joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const play = require('play-dl');
const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Estrutura para armazenar filas e players por servidor
const queues = new Map();
const players = new Map();

// Funções declaradas fora do bloco try
/**
 * Inicializa a fila de um servidor
 * @param {string} guildId - ID do servidor
 */
function initGuildQueue(guildId) {
  if (!queues.has(guildId)) {
    queues.set(guildId, {
      songs: [],
      currentSong: null,
      volume: 100,
      playing: false,
      loop: false,
      textChannel: null
    });
  }
  
  if (!players.has(guildId)) {
    const player = createAudioPlayer();
    players.set(guildId, player);
    
    player.on(AudioPlayerStatus.Idle, async () => {
      const queue = queues.get(guildId);
      if (!queue) return;
      
      if (queue.loop && queue.currentSong) {
        // Se o loop está ativado, adiciona a música atual de volta à fila
        queue.songs.push(queue.currentSong);
      }
      
      // Reproduz a próxima música
      if (queue.songs.length > 0) {
        const nextSong = queue.songs.shift();
        await playSong(guildId, nextSong);
      } else {
        queue.currentSong = null;
        queue.playing = false;
        
        // Desconecta após 5 minutos sem músicas
        setTimeout(() => {
          const connection = getVoiceConnection(guildId);
          if (connection && !queue.playing) {
            connection.destroy();
            console.log(`Desconectado do servidor ${guildId} por inatividade`);
          }
        }, 5 * 60 * 1000);
      }
    });
    
    player.on('error', (error) => {
      console.error(`Erro no player de áudio para o servidor ${guildId}:`, error);
      const queue = queues.get(guildId);
      if (queue && queue.textChannel) {
        queue.textChannel.send(`❌ Ocorreu um erro ao reproduzir a música: ${error.message || 'Erro desconhecido'}`);
      }
      
      // Tenta reproduzir a próxima música
      if (queue && queue.songs.length > 0) {
        const nextSong = queue.songs.shift();
        playSong(guildId, nextSong);
      } else if (queue) {
        queue.currentSong = null;
        queue.playing = false;
      }
    });
  }
}

/**
 * Reproduz uma música
 * @param {string} guildId - ID do servidor
 * @param {Object} song - Informações da música
 */
async function playSong(guildId, song) {
  const queue = queues.get(guildId);
  if (!song || !queue) return;
  
  queue.currentSong = song;
  queue.playing = true;
  
  try {
    // Obter stream usando play-dl
    const source = await play.stream(song.url);
    const resource = createAudioResource(source.stream, {
      inputType: source.type,
      metadata: {
        title: song.title,
        url: song.url
      }
    });
    
    const player = players.get(guildId);
    player.play(resource);
    
    console.log(`Tocando: ${song.title} no servidor ${guildId}`);
    
    // Enviar mensagem de reprodução
    if (queue.textChannel) {
      const embed = new EmbedBuilder()
        .setTitle("🎵 Tocando agora")
        .setDescription(`**${song.title}**`)
        .setThumbnail(song.thumbnail || null)
        .addFields(
          { name: "Duração", value: formatDuration(song.duration), inline: true },
          { name: "Solicitado por", value: song.requestedBy, inline: true }
        )
        .setColor("#3498db");
      
      queue.textChannel.send({ embeds: [embed] }).catch(err => {
        console.error('Erro ao enviar mensagem de música tocando:', err);
      });
    }
  } catch (error) {
    console.error(`Erro ao tocar ${song.title}:`, error);
    if (queue.textChannel) {
      queue.textChannel.send(`❌ Não foi possível reproduzir: **${song.title}** - ${error.message}`).catch(console.error);
    }
    
    // Tenta a próxima música
    if (queue.songs.length > 0) {
      const nextSong = queue.songs.shift();
      playSong(guildId, nextSong);
    } else {
      queue.currentSong = null;
      queue.playing = false;
    }
  }
}

/**
 * Adiciona uma música à fila
 * @param {Object} interaction - Interação Discord
 * @param {string} query - URL ou termo de busca
 * @returns {Promise<Object>} Informações da música adicionada
 */
async function addSong(interaction, query) {
  const guildId = interaction.guild.id;
  initGuildQueue(guildId);
  
  const queue = queues.get(guildId);
  queue.textChannel = interaction.channel;
  
  try {
    let songInfo;
    
    // Verificar o tipo de query
    if (play.yt_validate(query) === 'video') {
      // URL de vídeo do YouTube
      const videoInfo = await play.video_info(query);
      songInfo = {
        title: videoInfo.video_details.title,
        url: videoInfo.video_details.url,
        duration: videoInfo.video_details.durationInSec,
        thumbnail: videoInfo.video_details.thumbnails[0].url,
        requestedBy: interaction.user.tag
      };
    } else if (play.yt_validate(query) === 'playlist') {
      // Playlist do YouTube
      await interaction.followUp('🔍 Carregando playlist, por favor aguarde...');
      
      const playlistInfo = await play.playlist_info(query, { incomplete: true });
      const videos = await playlistInfo.all_videos();
      
      for (const video of videos) {
        queue.songs.push({
          title: video.title,
          url: video.url,
          duration: video.durationInSec,
          thumbnail: video.thumbnails[0].url,
          requestedBy: interaction.user.tag
        });
      }
      
      await interaction.followUp(`✅ Adicionadas **${videos.length}** músicas da playlist: **${playlistInfo.title}**`);
      
      // Se não estiver reproduzindo, inicia a primeira música
      if (!queue.playing) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
          return await interaction.followUp("❌ Você precisa estar em um canal de voz!");
        }
        
        joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: guildId,
          adapterCreator: interaction.guild.voiceAdapterCreator,
        }).subscribe(players.get(guildId));
        
        await playSong(guildId, queue.songs.shift());
      }
      
      return { playlist: true, title: playlistInfo.title, count: videos.length };
    } else if (play.sp_validate(query) !== 'invalid') {
      // Link do Spotify (track ou playlist)
      await interaction.followUp('🔍 Processando link do Spotify, por favor aguarde...');
      
      if (play.sp_validate(query) === 'track') {
        const spotifyData = await play.spotify(query);
        const searchResults = await play.search(`${spotifyData.name} ${spotifyData.artists[0].name}`, { limit: 1 });
        
        if (searchResults.length === 0) {
          return await interaction.followUp("❌ Não encontrei essa música no YouTube.");
        }
        
        const videoInfo = searchResults[0];
        songInfo = {
          title: videoInfo.title,
          url: videoInfo.url,
          duration: videoInfo.durationInSec,
          thumbnail: videoInfo.thumbnails[0].url,
          requestedBy: interaction.user.tag
        };
      } else if (play.sp_validate(query) === 'playlist' || play.sp_validate(query) === 'album') {
        const spotifyPlaylist = await play.spotify(query);
        let addedCount = 0;
        
        // Apenas as primeiras 30 músicas para evitar muito tempo de processamento
        const limit = Math.min(spotifyPlaylist.total_tracks, 30);
        await interaction.followUp(`🔍 Adicionando até ${limit} músicas da playlist do Spotify...`);
        
        for (let i = 0; i < limit; i++) {
          if (spotifyPlaylist.page(1)[i]) {
            const track = spotifyPlaylist.page(1)[i];
            try {
              const searchResults = await play.search(`${track.name} ${track.artists[0].name}`, { limit: 1 });
              
              if (searchResults.length > 0) {
                const videoInfo = searchResults[0];
                queue.songs.push({
                  title: videoInfo.title,
                  url: videoInfo.url,
                  duration: videoInfo.durationInSec,
                  thumbnail: videoInfo.thumbnails[0].url,
                  requestedBy: interaction.user.tag
                });
                addedCount++;
              }
            } catch (err) {
              console.error(`Erro ao processar música do Spotify: ${track.name}`, err);
            }
          }
        }
        
        await interaction.followUp(`✅ Adicionadas **${addedCount}** músicas da playlist do Spotify: **${spotifyPlaylist.name}**`);
        
        // Se não estiver reproduzindo, inicia a primeira música
        if (!queue.playing && queue.songs.length > 0) {
          const voiceChannel = interaction.member.voice.channel;
          if (!voiceChannel) {
            return await interaction.followUp("❌ Você precisa estar em um canal de voz!");
          }
          
          joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guildId,
            adapterCreator: interaction.guild.voiceAdapterCreator,
          }).subscribe(players.get(guildId));
          
          await playSong(guildId, queue.songs.shift());
        }
        
        return { playlist: true, title: spotifyPlaylist.name, count: addedCount };
      }
    } else {
      // Busca normal
      const searchResults = await play.search(query, { limit: 1 });
      if (searchResults.length === 0) {
        return await interaction.followUp("❌ Não encontrei nenhum resultado para essa busca.");
      }
      
      const videoInfo = searchResults[0];
      songInfo = {
        title: videoInfo.title,
        url: videoInfo.url,
        duration: videoInfo.durationInSec,
        thumbnail: videoInfo.thumbnails[0].url,
        requestedBy: interaction.user.tag
      };
    }
    
    // Adiciona à fila para casos que não são playlists
    if (songInfo) {
      queue.songs.push(songInfo);
      
      // Mensagem de confirmação
      const embed = new EmbedBuilder()
        .setTitle("🎵 Música adicionada à fila")
        .setDescription(`**${songInfo.title}**`)
        .setThumbnail(songInfo.thumbnail)
        .addFields(
          { name: "Duração", value: formatDuration(songInfo.duration), inline: true },
          { name: "Posição na fila", value: queue.playing ? `${queue.songs.length}` : "Tocando agora", inline: true },
          { name: "Solicitado por", value: songInfo.requestedBy, inline: true }
        )
        .setColor("#3498db");
      
      await interaction.followUp({ embeds: [embed] });
      
      // Se não estiver reproduzindo, inicia a música
      if (!queue.playing) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
          return await interaction.followUp("❌ Você precisa estar em um canal de voz!");
        }
        
        joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: guildId,
          adapterCreator: interaction.guild.voiceAdapterCreator,
        }).subscribe(players.get(guildId));
        
        await playSong(guildId, queue.songs.shift());
      }
      
      return songInfo;
    }
  } catch (error) {
    console.error("Erro ao adicionar música:", error);
    await interaction.followUp(`❌ Ocorreu um erro ao processar sua solicitação: ${error.message || 'Erro desconhecido'}`);
    return null;
  }
}

/**
 * Parar a reprodução e limpar a fila
 * @param {string} guildId - ID do servidor
 */
function stop(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return false;
  
  queue.songs = [];
  queue.currentSong = null;
  queue.playing = false;
  
  const player = players.get(guildId);
  if (player) {
    player.stop();
  }
  
  const connection = getVoiceConnection(guildId);
  if (connection) {
    connection.destroy();
  }
  
  return true;
}

/**
 * Pular para a próxima música
 * @param {string} guildId - ID do servidor
 * @returns {boolean} Se há próxima música
 */
function skip(guildId) {
  const queue = queues.get(guildId);
  const player = players.get(guildId);
  
  if (!queue || !player) return false;
  
  player.stop(); // Isso aciona o evento AudioPlayerStatus.Idle que reproduz a próxima música
  return queue.songs.length > 0;
}

/**
 * Pausar ou retomar a reprodução
 * @param {string} guildId - ID do servidor
 * @returns {boolean} true se pausado, false se retomado
 */
function pause(guildId) {
  const player = players.get(guildId);
  if (!player) return false;
  
  if (player.state.status === AudioPlayerStatus.Playing) {
    player.pause();
    return true;
  } else if (player.state.status === AudioPlayerStatus.Paused) {
    player.unpause();
    return false;
  }
  return false;
}

/**
 * Ativa/desativa o loop
 * @param {string} guildId - ID do servidor
 * @returns {boolean} Novo estado do loop
 */
function toggleLoop(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return false;
  
  queue.loop = !queue.loop;
  return queue.loop;
}

/**
 * Obter informações da fila
 * @param {string} guildId - ID do servidor
 * @returns {Object} Fila do servidor
 */
function getQueue(guildId) {
  return queues.get(guildId) || null;
}

/**
 * Obter a música atual
 * @param {string} guildId - ID do servidor
 * @returns {Object} Informações da música atual
 */
function getNowPlaying(guildId) {
  const queue = queues.get(guildId);
  return queue ? queue.currentSong : null;
}

/**
 * Formatar duração em segundos para formato MM:SS
 * @param {number} seconds - Duração em segundos
 * @returns {string} Duração formatada
 */
function formatDuration(seconds) {
  if (!seconds) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

function setupMusicManager(client) {
  try {
    console.log('Inicializando sistema de música com play-dl...');
    
    // Configurar caminhos
    const ytdlpPath = process.env.YTDLP_PATH || path.join(__dirname, '..', 'ffmpeg', 'yt-dlp.exe');
    const ffmpegPath = process.env.FFMPEG_PATH || path.join(__dirname, '..', 'ffmpeg', 'ffmpeg.exe');
    
    console.log(`YT-DLP Path: ${ytdlpPath}`);
    console.log(`FFmpeg Path: ${ffmpegPath}`);
    
    // Verificar se yt-dlp e ffmpeg existem
    if (fs.existsSync(ffmpegPath)) {
      console.log('✅ FFmpeg encontrado em:', ffmpegPath);
    } else {
      console.error('❌ FFmpeg não encontrado em:', ffmpegPath);
    }
    
    if (fs.existsSync(ytdlpPath)) {
      console.log('✅ yt-dlp encontrado em:', ytdlpPath);
      
      // Atualizar yt-dlp
      console.log('Atualizando yt-dlp...');
      exec(`"${ytdlpPath}" -U`, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Erro ao atualizar yt-dlp:', error);
          return;
        }
        console.log(stdout);
        console.log('✅ yt-dlp atualizado com sucesso!');
      });
    } else {
      console.error('❌ yt-dlp não encontrado em:', ytdlpPath);
    }
    
    // Definir opções do play-dl
    play.setToken({
      useragent: ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36']
    });
    
    // API de música para o cliente
    const musicManager = {
      addSong,
      stop,
      skip,
      pause,
      toggleLoop,
      getQueue,
      getNowPlaying,
      formatDuration,
      getPlayer: (guildId) => players.get(guildId) || null
    };
    
    // Adicionar ao cliente para acesso global
    client.musicManager = musicManager;
    console.log('✅ Sistema de música inicializado com sucesso!');
    
    return musicManager;
  } catch (error) {
    console.error('❌ Erro ao inicializar sistema de música:', error);
    return null;
  }
}

module.exports = setupMusicManager;