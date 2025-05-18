const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'avatar',
  description: 'Mostra o avatar de um usuário',
  aliases: ['foto', 'pfp'],
  cooldown: 3,
  execute(message, args, client) {
    const member = message.mentions.members.first() || message.member;
    
    const embed = new EmbedBuilder()
      .setTitle(`Avatar de ${member.user.tag}`)
      .setImage(member.user.displayAvatarURL({ size: 1024, dynamic: true }))
      .setColor('Random')
      .setFooter({ text: `Solicitado por ${message.author.tag}` })
      .setTimestamp();
      
    message.reply({ embeds: [embed] });
  }
};