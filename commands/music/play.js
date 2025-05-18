// commands/music/play.js
module.exports = {
  name: 'play',
  description: 'Toca uma música do YouTube, Spotify ou SoundCloud',
  aliases: ['p'],
  category: 'Music',
  usage: '<url ou nome da música>',
  cooldown: 3,
  
  async execute(message, args, client) {
    // Verificar se há argumentos
    if (!args.length) {
      return message.reply('❌ Você precisa fornecer uma URL ou nome de música!');
    }
    
    // Verificar se o usuário está em um canal de voz
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply('❌ Você precisa estar em um canal de voz para usar este comando!');
    }
    
    // Verificar permissões
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
      return message.reply('❌ Preciso de permissões para entrar e falar no canal de voz!');
    }
    
    // Obter a query dos argumentos
    const query = args.join(' ');
    
    try {
      // Log de diagnóstico
      console.log('Query recebida:', query);
      
      // Verificar se o cliente tem o DisTube
      if (!client.distube) {
        console.error('DisTube não encontrado, verificando alternativas...');
        // Tentar reinicializar o DisTube se possível
        try {
          const setupMusicSystem = require('../../helpers/musicSystem');
          client.distube = setupMusicSystem(client);
          if (!client.distube) {
            return message.reply('❌ Sistema de música não está funcionando corretamente. Reinicie o bot.');
          }
        } catch (err) {
          console.error('Erro ao tentar reinicializar o DisTube:', err);
          return message.reply('❌ Sistema de música não está funcionando corretamente. Reinicie o bot.');
        }
      }
      
      // Mensagem de carregamento
      const loadingMsg = await message.reply('🔍 Buscando música...');
      
      // Tocar a música usando DisTube com tratamento de erro aprimorado
      try {
        // A principal mudança para v5 - garantindo que estamos usando a API correta
        await client.distube.play(voiceChannel, query, {
          member: message.member,
          textChannel: message.channel,
          // Na v5, é melhor explicitar o canal de texto para mensagens
          // para evitar problemas com o erro getString
        });
        
        // Atualizar mensagem de carregamento
        await loadingMsg.edit('✅ Música encontrada e adicionada à fila!');
        
      } catch (playError) {
        console.error('Erro específico ao tocar música:', playError);
        
        if (playError.message && playError.message.includes('No result')) {
          await loadingMsg.edit('❌ Nenhum resultado encontrado para sua busca.');
        } else if (playError.message && playError.message.includes('Sign in')) {
          await loadingMsg.edit('❌ Esta música requer login no YouTube. Tente outra música.');
        } else if (playError.message && playError.message.includes('age-restricted')) {
          await loadingMsg.edit('❌ Este conteúdo tem restrição de idade no YouTube.');
        } else {
          await loadingMsg.edit(`❌ Erro ao reproduzir: ${playError.message || 'Erro desconhecido'}`);
        }
      }
    } catch (error) {
      console.error('Erro geral ao executar comando play:', error);
      message.reply(`❌ Ocorreu um erro: ${error.message || 'Erro desconhecido'}`);
    }
  }
};