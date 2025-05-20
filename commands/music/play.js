const { getSpotifyTracks } = require("../../utils/spotify");
const { findValidYouTubeLink } = require("../../utils/youtube");

module.exports = {
  name: "play",
  description: "Toca música do YouTube ou Spotify (com conversão automática via YouTube)",
  async execute(message, args) {
    if (!args.length)
      return message.reply("❌ Por favor, envie o nome ou link da música.");

    const canalVoz = message.member.voice.channel;
    if (!canalVoz)
      return message.reply("❌ Você precisa estar em um canal de voz para tocar música.");

    const consulta = args.join(" ");

    try {
      if (consulta.includes("spotify.com")) {
        const todasMusicas = await getSpotifyTracks(consulta);
        if (!todasMusicas.length)
          return message.reply("❌ Não encontrei músicas válidas na URL do Spotify.");

        // Limita para 100 músicas
        const musicas = todasMusicas.slice(0, 100);

        // Mensagem única que será editada para mostrar o progresso
        const statusMsg = await message.channel.send(`🔎 Convertendo 0/${musicas.length} músicas do Spotify para YouTube...`);

        for (let i = 0; i < musicas.length; i++) {
          const musica = musicas[i];
          const busca = `${musica.name} ${musica.artists}`;
          const linkYouTube = await findValidYouTubeLink(busca);

          if (linkYouTube) {
            await message.client.distube.play(canalVoz, linkYouTube, {
              member: message.member,
              textChannel: message.channel,
            });
          }

          // Atualiza o texto da mensagem mostrando o progresso
          await statusMsg.edit(`🔎 Convertendo ${i + 1}/${musicas.length} músicas do Spotify para YouTube...`);
        }

        await statusMsg.edit("✅ Todas as músicas da playlist/álbum foram adicionadas à fila.");
      } else {
        // Pesquisa ou link YouTube normal
        await message.client.distube.play(canalVoz, consulta, {
          member: message.member,
          textChannel: message.channel,
        });
        await message.channel.send(`🔊 Tocando sua música: **${consulta}**`);
      }
    } catch (erro) {
      console.error("Erro no comando play:", erro);
      message.reply("❌ Deu ruim ao tentar tocar a música.");
    }
  },
};