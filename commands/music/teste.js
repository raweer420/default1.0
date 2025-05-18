// commands/music/teste.js
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = {
  name: 'teste',
  description: 'Testa a reprodução de música',
  category: 'Música',
  async execute(message, args, client) {
    try {
      // Verificar se o usuário está em um canal de voz
      if (!message.member.voice.channel) {
        return message.reply('❌ Você precisa estar em um canal de voz para usar este comando!');
      }
      
      // Verificar caminhos
      const ytdlpPath = process.env.YTDLP_PATH || path.join(__dirname, '..', '..', 'ffmpeg', 'yt-dlp.exe');
      const ffmpegPath = process.env.FFMPEG_PATH || path.join(__dirname, '..', '..', 'ffmpeg', 'ffmpeg.exe');
      
      // Verificar se os executáveis existem
      const ytdlpExists = fs.existsSync(ytdlpPath);
      const ffmpegExists = fs.existsSync(ffmpegPath);
      
      // Mostrar status
      await message.reply(`
📊 **Teste de Sistema de Música**

🔧 **Ferramentas:**
- FFmpeg: ${ffmpegExists ? '✅ Encontrado' : '❌ Não encontrado'} (${ffmpegPath})
- yt-dlp: ${ytdlpExists ? '✅ Encontrado' : '❌ Não encontrado'} (${ytdlpPath})

🎵 **DisTube:**
- Inicializado: ${client.distube ? '✅ Sim' : '❌ Não'}
- Plugins: ${client.distube?.plugins?.size || 0}

📡 **Conexão:**
- API Ping: ${Math.round(client.ws.ping)}ms

Tentando reproduzir uma música de teste...
`);
      
      // Tentar reproduzir uma música conhecida por funcionar
      if (client.distube) {
        try {
          await client.distube.play(message.member.voice.channel, 'never gonna give you up', {
            member: message.member,
            textChannel: message.channel,
            message
          });
          message.channel.send('✅ Música de teste adicionada à fila!');
        } catch (error) {
          message.channel.send(`❌ Erro ao reproduzir música de teste: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.error('Erro no comando teste:', error);
      message.reply('❌ Ocorreu um erro ao testar o sistema de música.');
    }
  }
};