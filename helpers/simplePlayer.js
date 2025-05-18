const { createAudioResource, createAudioPlayer, NoSubscriberBehavior, AudioPlayerStatus, joinVoiceChannel } = require('@discordjs/voice');
const playdl = require('play-dl');
const { Collection } = require('discord.js');

class SimplePlayer {
  constructor() {
    this.queues = new Map();
    this.players = new Map();
    this.connections = new Map();
  }

  // Obter ou criar uma fila para um servidor
  getQueue(guildId) {
    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, {
        songs: [],
        volume: 100,
        playing: false,
        loop: false,
        textChannel: null
      });
    }
    return this.queues.get(guildId);
  }

  // Obter ou criar um player para um servidor
  getPlayer(guildId) {
    if (!this.players.has(guildId)) {
      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Pause
        }
      });

      player.on(AudioPlayerStatus.Idle, () => {
        this.playNext(guildId);
      });

      player.on('error', (error) => {
        console.error(`Erro no player do servidor ${guildId}:`, error);
        this.playNext(guildId);
      });

      this.players.set(guildId, player);
    }
    return this.players.get(guildId);
  }

  // Conectar a um canal de voz
  connect(voiceChannel) {
    if (!voiceChannel) return null;

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true
      });

      this.connections.set(voiceChannel.guild.id, connection);
      return connection;
    } catch (error) {
      console.error('Erro ao conectar ao canal de voz:', error);
      return null;
    }
  }

  // Desconectar de um canal de voz
  disconnect(guildId) {
    if (this.connections.has(guildId)) {
      const connection = this.connections.get(guildId);
      connection.destroy();
      this.connections.delete(guildId);
      this.queues.delete(guildId);
      if (this.players.has(guildId)) {
        const player = this.players.get(guildId);
        player.stop();
        this.players.delete(guildId);
      }
    }
  }

  // Adicionar música à fila e iniciar reprodução
  async play(voiceChannel, query, options = {}) {
    if (!voiceChannel) {
      throw new Error('Canal de voz não especificado');
    }

    const guildId = voiceChannel.guild.id;
    const queue = this.getQueue(guildId);
    queue.textChannel = options.textChannel || null;

    try {
      let songInfo;

      // Verificar se é um URL ou termo de busca
      if (
        query.includes('youtube.com') || 
        query.includes('youtu.be') ||
        query.includes('soundcloud.com') ||
        query.includes('spotify.com')
      ) {
        // É uma URL - verificar tipo
        let source;
        
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
          source = 'youtube';
        } else if (query.includes('soundcloud.com')) {
          source = 'soundcloud';
        } else if (query.includes('spotify.com')) {
          source = 'spotify';
        }

        console.log(`Detectada URL de ${source}: ${query}`);

        // Processar URL de acordo com o tipo
        if (source === 'youtube') {
          const info = await playdl.video_info(query);
          songInfo = {
            title: info.video_details.title,
            url: info.video_details.url,
            duration: info.video_details.durationInSec,
            thumbnail: info.video_details.thumbnails[0].url,
            requestedBy: options.member || null,
            source: 'Youtube'
          };
        } else if (source === 'soundcloud') {
          const info = await playdl.soundcloud(query);
          songInfo = {
            title: info.name,
            url: info.url,
            duration: Math.floor(info.durationInMs / 1000),
            thumbnail: info.thumbnail,
            requestedBy: options.member || null,
            source: 'SoundCloud'
          };
        } else if (source === 'spotify') {
          // Para Spotify, precisamos converter para YouTube
          // Removemos o "intl-pt" do caminho para normalizar
          const normalizedQuery = query.replace('/intl-pt/', '/');
          const info = await playdl.spotify(normalizedQuery);
          
          // Buscar no YouTube pela música do Spotify
          const searchResults = await playdl.search(`${info.name} ${info.artists[0]?.name || ''}`, { limit: 1 });
          
          if (searchResults.length === 0) throw new Error('Nenhum resultado encontrado para esta música');
          
          const videoInfo = searchResults[0];
          
          songInfo = {
            title: `${info.name} - ${info.artists.map(a => a.name).join(', ')}`,
            url: videoInfo.url,
            duration: info.durationInSec,
            thumbnail: info.thumbnail.url,
            requestedBy: options.member || null,
            source: 'Spotify → Youtube'
          };
        }
      } else {
        // É um termo de busca - buscar no YouTube
        const searchResults = await playdl.search(query, { limit: 1 });
        
        if (searchResults.length === 0) {
          throw new Error(`Nenhum resultado encontrado para: ${query}`);
        }
        
        const videoInfo = searchResults[0];
        
        songInfo = {
          title: videoInfo.title,
          url: videoInfo.url,
          duration: videoInfo.durationInSec,
          thumbnail: videoInfo.thumbnails[0].url,
          requestedBy: options.member || null,
          source: 'Youtube (Busca)'
        };
      }

      // Formatar duração
      songInfo.formattedDuration = this.formatDuration(songInfo.duration);

      // Adicionar à fila
      queue.songs.push(songInfo);
      
      // Conectar ao canal de voz se não estiver conectado
      if (!this.connections.has(guildId)) {
        this.connect(voiceChannel);
      }
      
      // Se não estiver tocando nada, iniciar a reprodução
      if (!queue.playing) {
        queue.playing = true;
        this.playSong(guildId);
      }
      
      return songInfo;
    } catch (error) {
      console.error('Erro ao processar música:', error);
      throw error;
    }
  }

  // Reproduzir a próxima música da fila
  playNext(guildId) {
    const queue = this.getQueue(guildId);
    
    // Se a fila estiver vazia, parar a reprodução
    if (queue.songs.length === 0) {
      queue.playing = false;
      return;
    }
    
    // Se estiver em loop, manter a música atual
    if (queue.loop) {
      // Não fazer nada, a música atual será reproduzida novamente
    } else {
      // Remover a música atual e passar para a próxima
      queue.songs.shift();
      
      // Se a fila estiver vazia agora, parar a reprodução
      if (queue.songs.length === 0) {
        queue.playing = false;
        return;
      }
    }
    
    // Reproduzir a próxima música
    this.playSong(guildId);
  }

  // Reproduzir uma música específica
  async playSong(guildId) {
    const queue = this.getQueue(guildId);
    const player = this.getPlayer(guildId);
    const connection = this.connections.get(guildId);
    
    if (!queue.songs.length || !connection) {
      queue.playing = false;
      return;
    }
    
    const song = queue.songs[0];
    
    try {
      let stream;
      
      if (song.url.includes('youtube.com') || song.url.includes('youtu.be')) {
        stream = await playdl.stream(song.url);
      } else if (song.url.includes('soundcloud.com')) {
        stream = await playdl.stream(song.url);
      } else {
        throw new Error('Formato não suportado');
      }
      
      const resource = createAudioResource(stream.stream, { 
        inputType: stream.type,
        inlineVolume: true
      });
      
      resource.volume.setVolume(queue.volume / 100);
      
      // Inscrever o player na conexão se ainda não estiver
      connection.subscribe(player);
      
      // Reproduzir a música
      player.play(resource);
      
      // Emitir evento de reprodução
      if (queue.textChannel) {
        queue.textChannel.send(`🎵 Tocando agora: **${song.title}** - \`${song.formattedDuration}\` - Fonte: ${song.source}`);
      }
      
      return song;
    } catch (error) {
      console.error('Erro ao reproduzir música:', error);
      this.playNext(guildId);
    }
  }

  // Pular para a próxima música
  skip(guildId) {
    if (!this.players.has(guildId)) return false;
    const player = this.players.get(guildId);
    player.stop();
    return true;
  }

  // Parar a reprodução e limpar a fila
  stop(guildId) {
    const queue = this.getQueue(guildId);
    queue.songs = [];
    queue.playing = false;
    
    if (this.players.has(guildId)) {
      const player = this.players.get(guildId);
      player.stop();
    }
    
    this.disconnect(guildId);
    return true;
  }

  // Pausar a reprodução
  pause(guildId) {
    if (!this.players.has(guildId)) return false;
    const player = this.players.get(guildId);
    player.pause();
    return true;
  }

  // Retomar a reprodução
  resume(guildId) {
    if (!this.players.has(guildId)) return false;
    const player = this.players.get(guildId);
    player.unpause();
    return true;
  }

  // Definir o volume
  setVolume(guildId, volume) {
    if (volume < 0 || volume > 100) return false;
    const queue = this.getQueue(guildId);
    queue.volume = volume;
    
    if (this.players.has(guildId)) {
      const player = this.players.get(guildId);
      if (player.state.resource) {
        player.state.resource.volume.setVolume(volume / 100);
      }
    }
    
    return true;
  }

  // Ativar/desativar loop
  toggleLoop(guildId) {
    const queue = this.getQueue(guildId);
    queue.loop = !queue.loop;
    return queue.loop;
  }

  // Utilitário para formatar duração em segundos para MM:SS
  formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

// Exportar uma instância única do player
const player = new SimplePlayer();
module.exports = player;