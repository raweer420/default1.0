// Substitua em commands/utility/help.js
const { EmbedBuilder } = require('discord.js');  // Certifique-se de que esta linha esteja correta
const { PREFIX } = require('../../config');  // Verifique se o caminho está correto

module.exports = {
  name: 'help',
  description: 'Lista todos os comandos disponíveis',
  aliases: ['comandos', 'ajuda'],
  cooldown: 5,
  execute(message, args, client) {
    // Debugar: adicionar mensagem para verificar se o comando está sendo executado
    console.log(`Executando comando help para ${message.author.tag}`);
    
    const { commands } = client;
    
    // Se um comando específico for solicitado
    if (args.length) {
      const commandName = args[0].toLowerCase();
      const command = commands.get(commandName) || 
                    commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
                  
      if (!command) {
        return message.reply('❌ Este comando não existe!');
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`Ajuda: ${command.name}`)
        .setColor('Blue')
        .setDescription(`**Descrição:** ${command.description || 'Sem descrição'}`)
        .addFields(
          { name: '📌 Uso', value: `\`${PREFIX}${command.name} ${command.usage || ''}\`` }
        );
        
      if (command.aliases && command.aliases.length) {
        embed.addFields({ name: '🔄 Alternativas', value: command.aliases.join(', ') });
      }
      
      if (command.cooldown) {
        embed.addFields({ name: '⏱️ Cooldown', value: `${command.cooldown} segundos` });
      }
      
      return message.reply({ embeds: [embed] });
    }
    
    // Lista todos os comandos
    const embed = new EmbedBuilder()
      .setTitle('📚 Lista de Comandos')
      .setColor('Blue')
      .setDescription(`Prefixo: \`${PREFIX}\` | Use \`${PREFIX}help [comando]\` para mais detalhes sobre um comando específico.`);
    
    // Agrupar comandos por categoria (pasta)
    const categories = new Map();
    
    commands.forEach(command => {
      // Determinar a categoria com base na pasta
      let category;
      try {
        // Tentativa alternativa de obter categoria
        if (command.category) {
          category = command.category;
        } else {
          // Se não existir uma propriedade category, use uma categoria padrão
          category = 'Sem Categoria';
        }
      } catch (error) {
        console.error(`Erro ao determinar categoria para ${command.name}:`, error);
        category = 'Sem Categoria';
      }
      
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      
      categories.get(category).push(`\`${command.name}\``);
    });
    
    categories.forEach((cmds, category) => {
      embed.addFields({ name: `${category}`, value: cmds.join(' | ') });
    });
    
    return message.reply({ embeds: [embed] }).catch(error => {
      console.error('Erro ao enviar resposta do help:', error);
      message.channel.send('Houve um erro ao exibir a ajuda. Por favor, tente novamente.').catch(() => {});
    });
  }
};