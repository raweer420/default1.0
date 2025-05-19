const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const path = require('path');

function setupMusicSystem(client) {
  const distube = new DisTube(client, {
    emitNewSongOnly: true,
    plugins: [
      new SpotifyPlugin({
        api: {
          clientId: 'ce9512970b244441878e3877deab1d69',
          clientSecret: '6a17b72541604ba4905200648d790f0f',
        }
      }),
      new YtDlpPlugin({
        update: true,
        // opcional: path para o yt-dlp (se tiver instalado localmente)
        // path: path.join(__dirname, '..', 'ffmpeg', 'yt-dlp.exe')
      }),
    ],
  });

  distube.on('error', (err, queue) => {
    console.error('Erro no DisTube:', err);
    if (queue) queue.textChannel.send(`❌ Erro ao reproduzir música: ${err.message}`);
  });

  return distube;
}

module.exports = setupMusicSystem;