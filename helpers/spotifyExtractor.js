const { ExtractorPlugin } = require("distube");

class SpotifyExtractor extends ExtractorPlugin {
  constructor(clientId, clientSecret) {
    super();
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  async getAccessToken() {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt - 60000) {
      // Token ainda é válido (com 1min de folga)
      return this.accessToken;
    }

    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) throw new Error("Erro ao obter token do Spotify.");

    const data = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = now + data.expires_in * 1000;

    return this.accessToken;
  }

  validate(url) {
    return /^https?:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+/.test(url);
  }

  async resolve(url) {
    const token = await this.getAccessToken();
    const id = url.split("/track/")[1].split("?")[0];

    const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Erro ao acessar API do Spotify.");

    const data = await res.json();

    if (!data.preview_url)
      throw new Error("Essa faixa não possui um preview de áudio.");

    return {
      name: `${data.name} - ${data.artists.map((a) => a.name).join(", ")}`,
      url: url,
      duration: Math.floor(data.duration_ms / 1000),
      streamURL: data.preview_url,
      isLive: false,
      thumbnail: data.album?.images[0]?.url || null,
    };
  }

  async getStreamURL(url) {
    const info = await this.resolve(url);
    return info.streamURL;
  }
}

module.exports = SpotifyExtractor;
