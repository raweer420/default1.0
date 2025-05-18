const { Events } = require('discord.js');
const { VERIFIED_ROLE_ID, STAFF_CHANNEL_ID } = require('../config');

module.exports = {
  name: Events.InteractionCreate,
  async execute(client, interaction) {
    if (!interaction.isButton()) return;

    const [action, userId] = interaction.customId.split('_');
    
    // Apenas botões de verificação
    if (!['approve', 'reject', 'block'].includes(action)) return;
    
    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    const role = interaction.guild.roles.cache.get(VERIFIED_ROLE_ID);

    if (!interaction.member.permissions.has('ManageRoles')) {
      return interaction.reply({ content: '❌ Você não tem permissão para isso.', ephemeral: true });
    }

    if (!member) {
      return interaction.reply({ content: '⚠️ Membro não encontrado. Talvez tenha saído do servidor.', ephemeral: true });
    }

    if (!role && action === 'approve') {
      return interaction.reply({ content: '⚠️ Cargo verificado não encontrado.', ephemeral: true });
    }

    // Log para moderação
    const logChannel = interaction.guild.channels.cache.get(STAFF_CHANNEL_ID);
    
    switch (action) {
      case 'approve':
        await member.roles.add(role);
        await member.send('✅ Você foi aprovado e agora tem acesso ao servidor!').catch(() => {});
        await interaction.update({ 
          content: `✅ ${member.user.tag} foi aprovado por ${interaction.user.tag}`, 
          components: [], 
          embeds: [] 
        });
        if (logChannel) {
          logChannel.send(`📝 **LOG:** ${interaction.user.tag} aprovou o usuário ${member.user.tag}`);
        }
        break;
        
      case 'reject':
        await member.send('❌ Sua entrada foi recusada. Se achar que é um erro, fale com um admin.').catch(() => {});
        await interaction.update({ 
          content: `❌ ${member.user.tag} foi recusado por ${interaction.user.tag}`, 
          components: [], 
          embeds: [] 
        });
        if (logChannel) {
          logChannel.send(`📝 **LOG:** ${interaction.user.tag} recusou o usuário ${member.user.tag}`);
        }
        // Kick após um breve delay para garantir que a DM seja enviada
        setTimeout(() => member.kick('Recusado na verificação').catch(console.error), 2000);
        break;
        
      case 'block':
        await member.send('🚫 Sua entrada foi bloqueada pelos administradores.').catch(() => {});
        await interaction.update({ 
          content: `🚫 ${member.user.tag} foi bloqueado por ${interaction.user.tag}`, 
          components: [], 
          embeds: [] 
        });
        if (logChannel) {
          logChannel.send(`📝 **LOG:** ${interaction.user.tag} bloqueou o usuário ${member.user.tag}`);
        }
        // Ban com motivo
        setTimeout(() => member.ban({ reason: 'Bloqueado na verificação' }).catch(console.error), 2000);
        break;
    }
  }
};