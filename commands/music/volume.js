module.exports = {
  name: 'volume',
  description: 'Ajusta o volume da reprodução',
  aliases: ['vol'],
  usage: '<1-100>',
  category: 'Música',
  async execute(message, args, client) {
    const { distube } = client;
    
    // Verificar se o usuário está em um canal de voz
    if (!message.member.voice.channel) {
      return message.reply('❌ Você precisa estar em um canal de voz para usar este comando!');
    }
    
    // Verificar se o bot está reproduzindo algo
    const queue = distube.getQueue(message.guildId);
    if (!queue) {
      return message.reply('❌ Não há nada tocando no momento!');
    }
    
    // Se não houver argumentos, mostrar volume atual
    if (!args[0]) {
      return message.reply(`🔊 Volume atual: **${queue.volume}%**`);
    }
    
    // Verificar se o argumento é um número válido
    const volume = parseInt(args[0]);
    if (isNaN(volume) || volume < 1 || volume > 100) {
      return message.reply('❌ Por favor, forneça um volume válido entre 1 e 100!');
    }
    
    // Ajustar volume
    queue.setVolume(volume);
    message.reply(`🔊 Volume ajustado para **${volume}%**`);
  }
};