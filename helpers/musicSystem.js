const { DisTube } = require("distube");
const { SpotifyPlugin } = require("@distube/spotify");
const { SoundCloudPlugin } = require("@distube/soundcloud");
const { YtDlpPlugin } = require("@distube/yt-dlp");

function setupMusicSystem(client) {
  const distube = new DisTube(client, {
    plugins: [
      new SpotifyPlugin(),
      new SoundCloudPlugin(),
      new YtDlpPlugin(),
    ],
  });

  // Salva no client para os comandos acessarem
  client.distube = distube;

  distube
    .on("playSong", (queue, song) => {
      console.log(`▶️ Tocando: ${song.name} - ${song.formattedDuration}`);
      queue.textChannel?.send(`🎶 Tocando: **${song.name}** — \`${song.formattedDuration}\``).catch(() => {});
    })
    .on("addSong", (queue, song) => {
      console.log(`➕ Música adicionada: ${song.name} - ${song.formattedDuration}`);
      queue.textChannel?.send(`➕ Adicionada à fila: **${song.name}** — \`${song.formattedDuration}\``).catch(() => {});
    })
    .on("error", (queue, error) => {
      console.error(`❌ Erro no DisTube:`, error);
      if (queue && queue.textChannel) {
        queue.textChannel.send(`❌ Ocorreu um erro: ${error.message || error}`).catch(() => {});
      }
    })
    .on("empty", queue => {
      console.log("👥 Canal de voz vazio, saindo...");
      queue.textChannel?.send("👥 Canal de voz vazio, saindo...").catch(() => {});
    })
    .on("finish", queue => {
      console.log("🏁 Fim da fila de músicas.");
      queue.textChannel?.send("🏁 Fim da fila de músicas.").catch(() => {});
    });

  return distube;
}

module.exports = setupMusicSystem;
