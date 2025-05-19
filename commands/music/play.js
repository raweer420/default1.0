module.exports = {
  name: 'play',
  description: 'Toca música do YouTube/Spotify',
  async execute(message, args) {
    if (!args.length) return message.reply('❌ Você precisa enviar o nome ou URL da música.');

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('❌ Você precisa estar em um canal de voz.');

    try {
      await message.client.distube.play(voiceChannel, args.join(' '), {
        member: message.member,
        textChannel: message.channel,
        message,
      });
      message.channel.send('🔊 Tocando sua música...');
    } catch (error) {
      console.error(error);
      message.channel.send('❌ Erro ao tentar tocar a música.');
    }
  }
};
