const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { YouTubePlugin } = require('@distube/youtube');
const { EmbedBuilder } = require('discord.js');

/**
 * Configura o sistema de música utilizando DisTube
 * @param {Client} client - O cliente do Discord
 */
function setupMusicSystem(client) {
  try {
    console.log('🎵 Inicializando sistema de música com DisTube...');
    
    // Criar plugins sem opções específicas
    const spotifyPlugin = new SpotifyPlugin({
      // Remova qualquer opção adicional
    });

    const soundCloudPlugin = new SoundCloudPlugin();

    const youtubePlugin = new YouTubePlugin({
      // Remova opções como skipGeoCheck
    });

    const ytDlpPlugin = new YtDlpPlugin();

    // Criar uma instância do DisTube
    const distube = new DisTube(client, {
      plugins: [
        spotifyPlugin, 
        soundCloudPlugin, 
        youtubePlugin, 
        ytDlpPlugin
      ],
      // Remova opções como leaveOnStop
    });
    
    // Configurar eventos básicos
    distube
      .on('playSong', (queue, song) => {
        try {
          const embed = new EmbedBuilder()
            .setTitle('🎵 Tocando agora')
            .setDescription(`**${song.name}**`)
            .setColor('#3498db');
          
          queue.textChannel.send({ embeds: [embed] });
        } catch (embedError) {
          console.error('Erro ao criar embed de música:', embedError);
        }
      })
      .on('error', (error, queue) => {
        console.error('Erro no DisTube:', error);
        if (queue && queue.textChannel) {
          queue.textChannel.send(`❌ Erro ao reproduzir música: ${error.message || 'Erro desconhecido'}`);
        }
      })
      .on('finish', queue => {
        // Implementação básica de saída do canal de voz após terminar a fila
        try {
          queue.voice.leave();
        } catch (leaveError) {
          console.error('Erro ao sair do canal de voz:', leaveError);
        }
      });
    
    // Adicionar a instância DisTube ao cliente
    client.distube = distube;
    
    console.log('✅ Sistema de música DisTube inicializado com sucesso!');
    return distube;
  } catch (initError) {
    console.error('❌ Erro ao inicializar sistema de música DisTube:', initError);
    return null;
  }
}

module.exports = setupMusicSystem;