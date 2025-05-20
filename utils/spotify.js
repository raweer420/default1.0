const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// Função para autenticar (token de acesso temporário)
async function authenticate() {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);
  } catch (error) {
    console.error('Erro ao autenticar Spotify:', error);
  }
}

// Extrai músicas da playlist
async function getTracksFromPlaylist(playlistId) {
  await authenticate();
  const tracks = [];
  let offset = 0;
  let total = 0;

  do {
    const data = await spotifyApi.getPlaylistTracks(playlistId, { offset, limit: 100 });
    total = data.body.total;
    data.body.items.forEach(item => {
      if (item.track) {
        tracks.push({
          name: item.track.name,
          artists: item.track.artists.map(a => a.name).join(", "),
        });
      }
    });
    offset += data.body.items.length;
  } while (offset < total);

  return tracks;
}

// Extrai músicas do álbum
async function getTracksFromAlbum(albumId) {
  await authenticate();
  const tracks = [];
  let offset = 0;
  let total = 0;

  do {
    const data = await spotifyApi.getAlbumTracks(albumId, { offset, limit: 50 });
    total = data.body.total;
    data.body.items.forEach(track => {
      tracks.push({
        name: track.name,
        artists: track.artists.map(a => a.name).join(", "),
      });
    });
    offset += data.body.items.length;
  } while (offset < total);

  return tracks;
}

// Extrai info da música (single)
async function getTrack(trackId) {
  await authenticate();
  const data = await spotifyApi.getTrack(trackId);
  return {
    name: data.body.name,
    artists: data.body.artists.map(a => a.name).join(", "),
  };
}

// Função que recebe uma URL Spotify e retorna array de músicas (nome + artista)
async function getSpotifyTracks(url) {
  // Extrai tipo e id da URL
  const regex = /spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/;
  const match = url.match(regex);
  if (!match) throw new Error('URL Spotify inválida');

  const type = match[1];
  const id = match[2];

  if (type === 'playlist') return await getTracksFromPlaylist(id);
  if (type === 'album') return await getTracksFromAlbum(id);
  if (type === 'track') {
    const track = await getTrack(id);
    return [track];
  }

  throw new Error('Tipo Spotify não suportado');
}

module.exports = {
  getSpotifyTracks,
};