const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const playdl = require('play-dl');

// Caminhos dos binários e do cookie
const ffmpegPath = path.join(__dirname, 'ffmpeg', 'ffmpeg.exe');
const ytdlpPath = path.join(__dirname, 'ffmpeg', 'yt-dlp.exe');
const cookiePath = path.join(__dirname, 'youtube_cookies.txt');

// Função para configurar play-dl
async function setupPlayDl() {
  try {
    // Verifica se o arquivo de cookie existe
    if (fs.existsSync(cookiePath)) {
      const cookieData = fs.readFileSync(cookiePath, 'utf-8');

      await playdl.setToken({
        youtube: {
          cookie: cookieData,
          useragent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
        }
      });

      console.log('✅ Cookie do YouTube carregado com sucesso!');
    } else {
      console.warn('⚠️ Arquivo de cookie do YouTube não encontrado. Algumas músicas podem não funcionar.');
    }
  } catch (error) {
    console.error('❌ Erro na configuração do play-dl:', error);
  }
}

// Verificar e configurar FFmpeg
if (fs.existsSync(ffmpegPath)) {
  console.log(`✅ FFmpeg encontrado em: ${ffmpegPath}`);
  process.env.FFMPEG_PATH = ffmpegPath;
  process.env.PATH = `${path.dirname(ffmpegPath)};${process.env.PATH}`;
} else {
  console.error(`❌ FFmpeg não encontrado em: ${ffmpegPath}`);
}

// Verificar e configurar yt-dlp
if (fs.existsSync(ytdlpPath)) {
  console.log(`✅ yt-dlp encontrado em: ${ytdlpPath}`);
  process.env.YTDLP_PATH = ytdlpPath;

  try {
    console.log('Atualizando yt-dlp...');
    execSync(`"${ytdlpPath}" -U`, { stdio: 'inherit' });
    console.log('✅ yt-dlp atualizado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao atualizar yt-dlp:', error.message);
  }
} else {
  console.error(`❌ yt-dlp não encontrado em: ${ytdlpPath}`);
}

// Função de diagnóstico
async function debugPlayDl(url) {
  try {
    console.log('🔍 Iniciando diagnóstico de URL:', url);

    const validateResult = playdl.yt_validate(url);
    console.log('Resultado da validação:', validateResult);

    const videoInfo = await playdl.video_info(url);
    console.log('Informações do vídeo:', {
      title: videoInfo.video_details.title,
      url: videoInfo.video_details.url
    });

    const stream = await playdl.stream(url, {
      discordPlayerCompatibility: true
    });

    console.log('Stream criado com sucesso');
    console.log('Tipo de stream:', stream.type);
  } catch (error) {
    console.error('❌ Erro detalhado:', error);
    throw error;
  }
}

module.exports = {
  setupPlayDl,
  debugPlayDl
};
