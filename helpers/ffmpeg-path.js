const path = require('path');
const fs = require('fs');

// Caminho para o binário do FFmpeg no projeto
const localFfmpegPath = path.join(__dirname, '..', 'ffmpeg', 'ffmpeg.exe');

// Verificar se o arquivo existe
if (fs.existsSync(localFfmpegPath)) {
    console.log(`✅ FFmpeg encontrado localmente em: ${localFfmpegPath}`);
    module.exports = localFfmpegPath;
} else {
    console.error(`❌ FFmpeg não encontrado em: ${localFfmpegPath}`);
    // Tentar encontrar globalmente
    try {
        const ffmpegStatic = require('ffmpeg-static');
        console.log(`✅ FFmpeg encontrado via npm: ${ffmpegStatic}`);
        module.exports = ffmpegStatic;
    } catch (err) {
        console.error('❌ FFmpeg não encontrado via npm');
        // Caminhos de fallback
        const fallbackPaths = [
            'C:\\ffmpeg\\bin\\ffmpeg.exe',
            path.join(process.env.USERPROFILE || process.env.HOME || '', 'ffmpeg', 'bin', 'ffmpeg.exe'),
            'ffmpeg'
        ];
        
        for (const ffmpegPath of fallbackPaths) {
            try {
                if (fs.existsSync(ffmpegPath)) {
                    console.log(`✅ FFmpeg encontrado em: ${ffmpegPath}`);
                    module.exports = ffmpegPath;
                    return;
                }
            } catch (e) {
                // Ignorar erros
            }
        }
        
        console.error('⚠️ AVISO: Nenhum FFmpeg encontrado! O bot não poderá reproduzir música.');
        module.exports = 'ffmpeg'; // Fallback, ainda vai dar erro, mas evita problemas de undefined
    }
}