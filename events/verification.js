const { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { VERIFY_CHANNEL_ID, STAFF_CHANNEL_ID, VERIFIED_ROLE_ID, WELCOME_MESSAGE, VERIFICATION_TIMEOUT } = require('../config');

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(client, reaction, user) {
    if (user.bot) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch {
        return;
      }
    }

    if (reaction.message.channel.id !== VERIFY_CHANNEL_ID) return;
    if (reaction.emoji.name !== '✅') return;

    try {
      const dm = await user.send(WELCOME_MESSAGE);
      const collector = dm.channel.createMessageCollector({ max: 1, time: VERIFICATION_TIMEOUT });

      collector.on('collect', async msg => {
        await msg.reply('✅ Obrigado pela resposta! A equipe irá analisar e você será notificado.');

        const staffChannel = await client.channels.fetch(STAFF_CHANNEL_ID);

        // Evita enviar múltiplas mensagens para o mesmo usuário
        const existingMessages = await staffChannel.messages.fetch({ limit: 50 });
        const hasPending = existingMessages.some(m =>
          m.embeds.length > 0 &&
          m.embeds[0].footer?.text === `ID: ${user.id}`
        );

        if (hasPending) {
          user.send('⚠️ Você já possui uma solicitação pendente. Aguarde a análise da equipe.').catch(() => {});
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle('📥 Novo membro aguardando verificação')
          .addFields(
            { name: '👤 Usuário', value: `<@${user.id}>`, inline: true },
            { name: '🔢 ID', value: user.id, inline: true },
            { name: '🗓️ Conta criada', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: '📝 Resposta', value: msg.content }
          )
          .setThumbnail(user.displayAvatarURL())
          .setColor('Yellow')
          .setFooter({ text: `ID: ${user.id}` })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`approve_${user.id}`)
            .setLabel('✅ Aprovar')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`reject_${user.id}`)
            .setLabel('❌ Recusar')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`block_${user.id}`)
            .setLabel('🚫 Bloquear')
            .setStyle(ButtonStyle.Secondary)
        );

        await staffChannel.send({ embeds: [embed], components: [row] });
      });

      collector.on('end', collected => {
        if (collected.size === 0) {
          user.send('⏱️ Você não respondeu a tempo. Reaja novamente para tentar de novo.').catch(() => {});
        }
      });

    } catch (error) {
      console.error('Erro ao enviar DM:', error);
      const verifyChannel = await client.channels.fetch(VERIFY_CHANNEL_ID);
      verifyChannel.send(`<@${user.id}>, não consegui te enviar DM. Verifique suas configurações de privacidade.`)
        .then(msg => setTimeout(() => msg.delete().catch(() => {}), 10000));
    }
  }
};