// diagnostico-ffmpeg.js
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Diagnóstico do sistema
console.log('=== DIAGNÓSTICO DO SISTEMA DE MÚSICA ===');
console.log(`Sistema operacional: ${os.platform()} ${os.release()}`);
console.log(`Node.js versão: ${process.version}`);
console.log(`Pasta atual: ${process.cwd()}`);

// Verificar FFmpeg
const ffmpegPath = path.join(__dirname, 'ffmpeg', 'ffmpeg.exe');
const ytdlpPath = path.join(__dirname, 'ffmpeg', 'yt-dlp.exe');

console.log('\n=== VERIFICAÇÃO DE ARQUIVOS ===');
console.log(`Caminho do FFmpeg: ${ffmpegPath}`);
console.log(`FFmpeg existe: ${fs.existsSync(ffmpegPath) ? 'Sim ✅' : 'Não ❌'}`);

console.log(`Caminho do yt-dlp: ${ytdlpPath}`);
console.log(`yt-dlp existe: ${fs.existsSync(ytdlpPath) ? 'Sim ✅' : 'Não ❌'}`);

// Verificar permissões de execução
try {
  console.log('\n=== TESTE DE EXECUÇÃO DO FFMPEG ===');
  const ffmpegVersion = execSync(`"${ffmpegPath}" -version`, { timeout: 5000 }).toString().split('\n')[0];
  console.log(`FFmpeg versão: ${ffmpegVersion}`);
  console.log('FFmpeg executado com sucesso ✅');
} catch (error) {
  console.error('❌ Erro ao executar FFmpeg:', error.message);
  console.log('Detalhes do erro:', error);
}

try {
  console.log('\n=== TESTE DE EXECUÇÃO DO YT-DLP ===');
  const ytdlpVersion = execSync(`"${ytdlpPath}" --version`, { timeout: 5000 }).toString().trim();
  console.log(`yt-dlp versão: ${ytdlpVersion}`);
  console.log('yt-dlp executado com sucesso ✅');
} catch (error) {
  console.error('❌ Erro ao executar yt-dlp:', error.message);
  console.log('Detalhes do erro:', error);
}

// Verificar dependências instaladas
console.log('\n=== DEPENDÊNCIAS INSTALADAS ===');
const packageJson = require('./package.json');
console.log('Dependências relacionadas a música:');
['distube', '@distube/spotify', '@distube/soundcloud', '@distube/youtube', '@distube/yt-dlp', 
 '@discordjs/voice', '@discordjs/opus', 'play-dl', 'ffmpeg-static']
  .forEach(dep => {
    console.log(`${dep}: ${packageJson.dependencies[dep] || 'Não instalado'}`);
  });

// Testar acesso à rede (YouTube)
console.log('\n=== TESTE DE CONECTIVIDADE ===');
try {
  const ytdlpTest = execSync(`"${ytdlpPath}" -f "bestaudio" --print-json --no-playlist --default-search "ytsearch" "test" --simulate --no-warnings`, 
    { timeout: 10000 }).toString();
  console.log('Conectividade com YouTube: Sucesso ✅');
} catch (error) {
  console.error('❌ Erro de conectividade com YouTube:', error.message);
}

console.log('\n=== DIAGNÓSTICO CONCLUÍDO ===');
console.log('Execute este arquivo com "node diagnostico-ffmpeg.js" para verificar o sistema de música');