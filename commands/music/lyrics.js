// commands/music/lyrics.js
const { EmbedBuilder } = require('discord.js');
// Use node-fetch em vez de fetch diretamente
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = {
  name: 'lyrics',
  description: 'Mostra a letra da música atual ou de uma música especificada',
  aliases: ['letra'],
  category: 'Music',
  usage: '[nome da música]',
  cooldown: 10,
  
  async execute(message, args, client) {
    try {
      // Verificar se o DisTube existe
      if (!client.distube) {
        return message.reply('❌ Sistema de música não está disponível no momento.');
      }

      // Determinar qual música buscar
      let songTitle;
      const queue = client.distube.getQueue(message);
      
      if (args.length > 0) {
        // Se argumentos foram fornecidos, use-os como nome da música
        songTitle = args.join(' ');
      } else if (queue && queue.songs && queue.songs[0]) {
        // Se não, use a música atual se existir
        songTitle = queue.songs[0].name;
      } else {
        return message.reply('❌ Especifique o nome de uma música ou reproduza uma música primeiro!');
      }

      // Aviso de carregamento
      const loadingMsg = await message.reply(`🔍 Buscando letra para "${songTitle}"...`);

      try {
        // Usar a API do Genius para buscar letras
        // Limpar o título da música (remover parênteses, colchetes, etc.)
        const cleanTitle = songTitle
          .replace(/\(.*?\)/g, '') // Remove conteúdo entre parênteses
          .replace(/\[.*?\]/g, '') // Remove conteúdo entre colchetes
          .replace(/ft\..*?$/i, '') // Remove "ft. alguém"
          .replace(/feat\..*?$/i, '') // Remove "feat. alguém"
          .trim();

        // Buscar na API do Genius (substitua com sua API KEY se tiver)
        const apiUrl = `https://api.genius.com/search?q=${encodeURIComponent(cleanTitle)}`;
        
        // Se você tiver uma API key do Genius, use-a
        const apiKey = process.env.GENIUS_API_KEY || 'YOUR_GENIUS_API_KEY'; // Substitua pela sua chave
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Resposta da API: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.response.hits.length) {
          return loadingMsg.edit(`❌ Não encontrei letras para "${songTitle}"`);
        }
        
        // Pegar o primeiro resultado
        const firstHit = data.response.hits[0];
        const songUrl = firstHit.result.url;
        
        // Enviar resposta com link para as letras
        const embed = new EmbedBuilder()
          .setTitle(`📝 Letra de "${firstHit.result.title}"`)
          .setDescription(`Artista: ${firstHit.result.primary_artist.name}\n\n[Clique aqui para ver a letra completa](${songUrl})`)
          .setThumbnail(firstHit.result.song_art_image_url)
          .setColor('#FFFF00')
          .setFooter({ text: 'Fornecido por Genius Lyrics' });
        
        loadingMsg.edit({ content: null, embeds: [embed] });
      } catch (error) {
        console.error('Erro ao buscar letra:', error);
        loadingMsg.edit(`❌ Erro ao buscar letra: ${error.message}`);
      }
    } catch (error) {
      console.error('Erro no comando lyrics:', error);
      message.reply(`❌ Ocorreu um erro ao executar o comando: ${error.message}`);
    }
  }
};