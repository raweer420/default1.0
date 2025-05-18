const { Events } = require('discord.js');
const { DEFAULT_ROLE_ID, VERIFY_CHANNEL_ID, LOG_CHANNEL_ID } = require('../config');
const LogManager = require('../logger/logManager');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(client, member) {
    // Código existente para adicionar cargo padrão
    const role = member.guild.roles.cache.get(DEFAULT_ROLE_ID);

    if (!role) {
      console.error('❌ Cargo padrão não encontrado.');
    } else {
      try {
        await member.roles.add(role);
        console.log(`✅ Cargo ${role.name} adicionado a ${member.user.tag}`);
        
        // Mensagem de boas-vindas privada (opcional)
        await member.send(`👋 Bem-vindo ao ${member.guild.name}! Por favor, visite o canal <#${VERIFY_CHANNEL_ID}> para verificar sua conta.`).catch(() => {});
        
      } catch (error) {
        console.error(`❌ Erro ao adicionar cargo:`, error);
      }
    }

    // Adicionando agora os logs
    try {
      // Calcular a idade da conta
      const accountAge = Date.now() - member.user.createdTimestamp;
      const accountAgeDays = Math.floor(accountAge / (1000 * 60 * 60 * 24));
      
      // Verificar se é uma conta nova (menos de 7 dias)
      const isNewAccount = accountAgeDays < 7;
      
      await LogManager.sendLog(client, {
        title: '👋 Novo Membro',
        color: isNewAccount ? 'Yellow' : 'Green', // Amarelo para contas novas (alerta)
        thumbnail: member.user.displayAvatarURL(),
        fields: [
          { name: '👤 Usuário', value: `${member.user.tag} (${member.user.id})`, inline: true },
          { name: '🤖 Bot?', value: member.user.bot ? 'Sim' : 'Não', inline: true },
          { name: '📅 Entrou em', value: LogManager.formatTimestamp(Date.now()), inline: true },
          { name: '🗓️ Conta criada em', value: LogManager.formatTimestamp(member.user.createdAt), inline: true },
          { name: '⏱️ Idade da conta', value: `${accountAgeDays} dias ${isNewAccount ? '⚠️' : ''}`, inline: true },
          { name: '🔢 Membros no servidor', value: `${member.guild.memberCount}`, inline: true }
        ]
      });
    } catch (error) {
      console.error('❌ Erro ao registrar entrada de membro:', error);
    }
  }
};