const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ping',
  description: 'Verifica a latência do bot',
  cooldown: 3,
  async execute(message, args, client) {
    // Registrar tempo da mensagem inicial
    const startTime = Date.now();
    
    // Enviar mensagem inicial
    const initialMessage = await message.channel.send('🏓 Calculando ping...');
    
    // Calcular latência de mensagem (ida e volta)
    const messageLatency = Date.now() - startTime;
    
    // Obter latência da API (WebSocket)
    const apiLatency = Math.round(client.ws.ping);
    
    // Criar embed com informações
    const embed = new EmbedBuilder()
      .setTitle('🏓 Ping!')
      .setColor(getPingColor(messageLatency))
      .addFields(
        { name: '⏱️ Latência', value: `${messageLatency}ms`, inline: true },
        { name: '📡 API', value: `${apiLatency}ms`, inline: true },
        { name: '📊 Status', value: getStatus(messageLatency), inline: true }
      )
      .setFooter({ text: 'Tempo de resposta do bot' })
      .setTimestamp();
    
    // Editar mensagem com os resultados
    await initialMessage.edit({ content: null, embeds: [embed] });
  }
};

// Função para determinar cor com base no ping
function getPingColor(ping) {
  if (ping < 100) return '#43B581'; // Verde
  if (ping < 200) return '#FAA61A'; // Amarelo
  return '#F04747';                 // Vermelho
}

// Função para determinar status com base no ping
function getStatus(ping) {
  if (ping < 100) return '🟢 Excelente';
  if (ping < 200) return '🟡 Bom';
  if (ping < 400) return '🟠 Médio';
  return '🔴 Ruim';
}