// commands/moderation/nuke.js
module.exports = {
  name: 'nuke',
  description: 'Limpa todas as mensagens de um canal',
  aliases: ['clear', 'limpar'],
  permissions: 'ManageMessages',
  cooldown: 10,
  async execute(message, args, client) {
    const { NUKE_ROLE_ID, LOG_CHANNEL_ID } = require('../../config');
    
    // Verificar se o usuário tem o cargo necessário
    if (!message.member.roles.cache.has(NUKE_ROLE_ID)) {
      return message.reply('❌ Você não tem permissão para usar este comando.');
    }
    
    // Opção para quantidade específica
    let amount = 100;
    if (args.length > 0 && !isNaN(args[0]) && args[0] > 0 && args[0] <= 100) {
      amount = parseInt(args[0]);
    }
    
    // Verificar se há um motivo fornecido
    let reason = null;
    if (args.length > 1 && args[0] !== 'all') {
      reason = args.slice(1).join(' ');
    } else if (args.length > 1 && args[0] === 'all') {
      reason = args.slice(1).join(' ');
    }
    
    // Confirmação
    await message.reply(`⚠️ Tem certeza que deseja apagar até ${amount} mensagens? Responda com **sim** para confirmar.`);
    
    const filter = m => m.author.id === message.author.id && m.content.toLowerCase() === 'sim';
    const collector = message.channel.createMessageCollector({ filter, time: 10000, max: 1 });
    
    collector.on('collect', async () => {
      try {
        // Deletar mensagem de confirmação
        await message.channel.messages.fetch({ limit: 2 }).then(msgs => {
          message.channel.bulkDelete(msgs);
        });
        
        let messagesDeleted = 0;
        
        if (args[0] === 'all') {
          // Nuke completo
          let lastId;
          messagesDeleted = 0;
          
          const statusMsg = await message.channel.send('🧹 Limpando mensagens...');
          
          while (true) {
            const options = { limit: 100 };
            if (lastId) options.before = lastId;
            
            const messages = await message.channel.messages.fetch(options);
            if (messages.size === 0) break;
            
            await message.channel.bulkDelete(messages, true);
            messagesDeleted += messages.size;
            
            // Atualizar status a cada 500 mensagens
            if (messagesDeleted % 500 === 0) {
              await statusMsg.edit(`🧹 Limpando mensagens... (${messagesDeleted} deletadas)`);
            }
            
            if (messages.size < 100) break;
            lastId = messages.last().id;
          }
          
          await statusMsg.delete();
          const logMsg = await message.channel.send(`\`\`\`\nCanal limpo por: ${message.author.tag}\n${messagesDeleted} mensagens removidas\n\`\`\``);
          
          // Log
          console.log(`✅ Canal ${message.channel.name} nukado por ${message.author.tag} (${messagesDeleted} mensagens)`);
        } else {
          // Deletar quantidade específica
          const fetched = await message.channel.messages.fetch({ limit: amount });
          await message.channel.bulkDelete(fetched, true);
          messagesDeleted = fetched.size;
          
          const logMsg = await message.channel.send(`\`\`\`\nCanal limpo por: ${message.author.tag}\n${fetched.size} mensagens removidas\n\`\`\``);
          
          // Log  
          console.log(`✅ Canal ${message.channel.name} limpo por ${message.author.tag} (${fetched.size} mensagens)`);
        }
        
        // Registrar no sistema de logs
        try {
          // Importar a função de log - corrigido para o caminho correto
          const { logMessagePurge } = require('../../logger/purgeLog');
          
          // Enviar log
          await logMessagePurge(client, message.channel, messagesDeleted, message.author, reason);
        } catch (logError) {
          console.error('❌ Erro ao registrar log:', logError);
        }
        
      } catch (err) {
        console.error('❌ Erro ao executar !nuke:', err);
        message.channel.send('❌ Ocorreu um erro ao tentar limpar este canal.');
      }
    });
    
    collector.on('end', collected => {
      if (collected.size === 0) {
        message.reply('⏱️ Tempo esgotado. Operação cancelada.').then(msg => {
          setTimeout(() => msg.delete().catch(() => {}), 5000);
        });
      }
    });
  }
};