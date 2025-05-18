// events/ready.js (Melhorado)
const { Events, ActivityType } = require('discord.js');
const { VERIFY_CHANNEL_ID } = require('../config');
const LogManager = require('../logger/logManager');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Bot online como ${client.user.tag}`);
    
    // Criar array de status para rotação
    const statuses = [
      { text: 'verificação de membros', type: ActivityType.Watching },
      { text: 'músicas para o servidor', type: ActivityType.Playing },
      { text: `${client.config?.PREFIX || '!'}help para comandos`, type: ActivityType.Playing },
      { text: 'logs do servidor', type: ActivityType.Watching }
    ];
    
    let statusIndex = 0;
    
    // Definir status inicial
    updateStatus();
    
    // Rotacionar status a cada 5 minutos
    setInterval(updateStatus, 5 * 60 * 1000);
    
    // Função para atualizar o status
    function updateStatus() {
      const status = statuses[statusIndex];
      client.user.setActivity(status.text, { type: status.type });
      
      // Avançar para o próximo status (voltando ao início se necessário)
      statusIndex = (statusIndex + 1) % statuses.length;
    }
    
    // Verificar e configurar canal de verificação
    try {
      if (VERIFY_CHANNEL_ID) {
        const verifyChannel = await client.channels.fetch(VERIFY_CHANNEL_ID);

        const pinnedMessages = await verifyChannel.messages.fetchPinned();
        let botMessage = pinnedMessages.find(msg =>
          msg.author.id === client.user.id && msg.content.includes('Reaja com ✅')
        );

        if (!botMessage) {
          botMessage = await verifyChannel.send('👋 Reaja com ✅ para iniciar sua verificação via DM.');
          await botMessage.pin();
        }
      }
    } catch (err) {
      console.error('❌ Erro ao buscar o canal de verificação:', err);
    }
    
    // Gerar estatísticas iniciais
    const guildCount = client.guilds.cache.size;
    const memberCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const channelCount = client.channels.cache.size;
    
    // Enviar log de inicialização
    try {
      await LogManager.sendLog(client, {
        title: '🟢 Bot Iniciado',
        color: 'Green',
        description: `O bot foi inicializado com sucesso em ${new Date().toLocaleString()}`,
        fields: [
          { name: '🤖 Tag', value: client.user.tag, inline: true },
          { name: '🆔 ID', value: client.user.id, inline: true },
          { name: '📡 Status', value: 'Online e Operacional', inline: true },
          { name: '🔢 Estatísticas', value: `Servidores: ${guildCount}\nMembros: ${memberCount}\nCanais: ${channelCount}`, inline: false }
        ]
      });
    } catch (error) {
      console.error('❌ Erro ao enviar log de inicialização:', error);
    }
    
    // Verificar comandos carregados
    const commandCount = client.commands.size;
    console.log(`📝 ${commandCount} comandos carregados`);
    
    // Inicializar contadores e estatísticas
    client.stats = {
      commandsUsed: 0,
      messagesReceived: 0,
      startTime: Date.now()
    };
  }
};