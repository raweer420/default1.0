const fetch = require('node-fetch'); // necessário para spotify-url-info
const spotifyGetData = require('spotify-url-info')(fetch);

async function playSpotifyThroughYouTube(distube, voiceChannel, textChannel, query, member) {
  const spotifyUrlRegex = /https?:\/\/(open\.)?spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/;
  const match = query.match(spotifyUrlRegex);

  if (!match) {
    // Não é link spotify, toca direto
    return distube.play(voiceChannel, query, { textChannel, member });
  }

  const type = match[2];
  const id = match[3];

  if (type === 'track') {
    const trackInfo = await spotifyGetData.getTrack(query);
    if (!trackInfo) throw new Error('Não foi possível obter dados da música no Spotify.');

    const searchString = `${trackInfo.name} ${trackInfo.artists[0].name}`;
    return distube.play(voiceChannel, searchString, { textChannel, member });
  } 

  if (type === 'album' || type === 'playlist') {
    let tracks;
    if (type === 'album') {
      tracks = await spotifyGetData.getAlbum(query);
    } else {
      tracks = await spotifyGetData.getPlaylist(query);
    }

    if (!tracks || !tracks.tracks.length) throw new Error('Nenhuma música encontrada na playlist/álbum.');

    for (const track of tracks.tracks) {
      const searchString = `${track.name} ${track.artists[0].name}`;
      await distube.play(voiceChannel, searchString, { textChannel, member, skip: true });
    }

    await distube.resume(voiceChannel);
    textChannel.send(`✅ Adicionadas ${tracks.tracks.length} músicas da ${type} no Spotify via busca no YouTube.`);
  }
}

module.exports = { playSpotifyThroughYouTube };