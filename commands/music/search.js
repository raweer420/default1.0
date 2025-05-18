const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'search',
  description: 'Pesquisa músicas no YouTube',
  aliases: ['buscar', 'find'],
  usage: '<termo de busca>',
  category: 'Música',
  async execute(message, args, client) {
    const { distube } = client;
    
    // Verificar se há um termo de busca
    if (!args.length) {
      return message.reply('❌ Por favor, informe um termo para pesquisar.');
    }
    
    const query = args.join(' ');
    
    // Enviar mensagem de carregamento
    const loadingMessage = await message.channel.send('🔍 Pesquisando músicas...');
    
    try {
      // Buscar músicas
      const results = await distube.search(query, { limit: 10 });
      
      if (!results || results.length === 0) {
        return loadingMessage.edit('❌ Nenhum resultado encontrado!');
      }
      
      // Criar embed com os resultados
      const embed = new EmbedBuilder()
        .setTitle(`🔎 Resultados para: ${query}`)
        .setColor('#36B37E')
        .setDescription(
          results.map((song, index) => 
            `**${index + 1}.** [${song.name}](${song.url}) - \`${song.formattedDuration}\``
          ).join('\n\n')
        )
        .setFooter({ text: 'Digite o número da música que deseja reproduzir ou "cancelar" para cancelar.' });
      
      // Enviar resultados
      await loadingMessage.edit({ content: null, embeds: [embed] });
      
      // Coletar resposta do usuário
      const filter = m => m.author.id === message.author.id;
      const collector = message.channel.createMessageCollector({ filter, time: 30000, max: 1 });
      
      collector.on('collect', async msg => {
        // Verificar se o usuário cancelou
        if (msg.content.toLowerCase() === 'cancelar') {
          msg.delete().catch(() => {});
          return loadingMessage.edit('🚫 Pesquisa cancelada.');
        }
        
        // Verificar se é um número válido
        const choice = parseInt(msg.content);
        if (isNaN(choice) || choice < 1 || choice > results.length) {
          msg.delete().catch(() => {});
          return loadingMessage.edit('❌ Número inválido! Pesquisa cancelada.');
        }
        
        // Reproduzir a música escolhida
        msg.delete().catch(() => {});
        loadingMessage.edit(`✅ Reproduzindo: **${results[choice - 1].name}**`);
        
        // Verificar se o usuário está em um canal de voz
        if (!message.member.voice.channel) {
          return loadingMessage.edit('❌ Você precisa estar em um canal de voz para reproduzir música!');
        }
        
        try {
          await distube.play(message.member.voice.channel, results[choice - 1].url, {
            member: message.member,
            textChannel: message.channel,
            message
          });
        } catch (error) {
          console.error('Erro ao reproduzir música:', error);
          loadingMessage.edit(`❌ Erro ao reproduzir: ${error.message.slice(0, 1900)}`);
        }
      });
      
      collector.on('end', collected => {
        if (collected.size === 0) {
          loadingMessage.edit('⏱️ Tempo esgotado! Pesquisa cancelada.');
        }
      });
    } catch (error) {
      console.error('Erro ao pesquisar músicas:', error);
      loadingMessage.edit(`❌ Erro ao pesquisar: ${error.message.slice(0, 1900)}`);
    }
  }
};