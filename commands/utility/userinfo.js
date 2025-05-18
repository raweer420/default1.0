// Substitua em commands/utility/userinfo.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'userinfo',
  description: 'Mostra informações sobre um usuário',
  aliases: ['user', 'info'],
  cooldown: 3,
  async execute(message, args, client) {
    // Debugar: adicionar mensagem para verificar se o comando está sendo executado
    console.log(`Executando comando userinfo para ${message.author.tag}`);
    
    try {
      let member;
      
      if (message.mentions.members.size > 0) {
        member = message.mentions.members.first();
      } else if (args[0]) {
        try {
          member = await message.guild.members.fetch(args[0]);
        } catch {
          member = null;
        }
      } else {
        member = message.member;
      }
      
      if (!member) {
        return message.reply('❌ Usuário não encontrado!');
      }
      
      const joinedAt = Math.floor(member.joinedTimestamp / 1000);
      const createdAt = Math.floor(member.user.createdTimestamp / 1000);
      
      const embed = new EmbedBuilder()
        .setTitle(`Informações do Usuário: ${member.user.tag}`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setColor(member.displayHexColor === '#000000' ? '#2F3136' : member.displayHexColor)
        .addFields(
          { name: '📛 Nome', value: member.user.tag, inline: true },
          { name: '🆔 ID', value: member.id, inline: true },
          { name: '🚪 Entrou no servidor', value: `<t:${joinedAt}:R>`, inline: true },
          { name: '🗓️ Conta criada', value: `<t:${createdAt}:R>`, inline: true },
          { name: '🎭 Cargos', value: member.roles.cache.size > 1 ? 
            member.roles.cache.filter(r => r.id !== message.guild.id).map(r => `<@&${r.id}>`).join(' | ') : 
            'Nenhum cargo'
          }
        )
        .setFooter({ text: `Solicitado por ${message.author.tag}` })
        .setTimestamp();
        
      return message.reply({ embeds: [embed] }).catch(error => {
        console.error('Erro ao enviar resposta do userinfo:', error);
        message.channel.send('Houve um erro ao exibir as informações. Por favor, tente novamente.').catch(() => {});
      });
    } catch (error) {
      console.error('Erro ao executar userinfo:', error);
      return message.reply('❌ Ocorreu um erro ao executar este comando.');
    }
  }
};