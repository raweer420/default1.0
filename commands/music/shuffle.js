module.exports = {
  name: 'shuffle',
  description: 'Embaralha a fila de reprodução',
  aliases: ['embaralhar', 'aleatorio'],
  category: 'Música',
  async execute(message, args, client) {
    const { distube } = client;
    
    // Verificar se o usuário está em um canal de voz
    if (!message.member.voice.channel) {
      return message.reply('❌ Você precisa estar em um canal de voz para usar este comando!');
    }
    
    // Verificar se o bot está reproduzindo algo
    const queue = distube.getQueue(message.guildId);
    if (!queue || queue.songs.length < 3) {
      return message.reply('❌ Não há músicas suficientes na fila para embaralhar!');
    }
    
    queue.shuffle();
    message.reply('🔀 Fila embaralhada!');
  }
};