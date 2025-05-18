const playdl = require('play-dl');

async function fullDiagnosis() {
  try {
    // Versão
    console.log(`🔢 Versão: ${playdl.version}`);

    // URLs de teste
    const testUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ'
    ];

    for (const url of testUrls) {
      console.log(`\n🔗 Testando URL: ${url}`);
      
      // Validação
      const validateResult = playdl.yt_validate(url);
      console.log('📋 Resultado da Validação:', validateResult);

      // Se for vídeo, tentar obter informações
      if (validateResult === 'video') {
        try {
          const videoInfo = await playdl.video_info(url);
          console.log('✅ Informações do Vídeo:');
          console.log('Título:', videoInfo.video_details.title);
          console.log('Canal:', videoInfo.video_details.channel.name);
        } catch (videoInfoError) {
          console.error('❌ Erro ao obter informações do vídeo:', videoInfoError);
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fullDiagnosis();