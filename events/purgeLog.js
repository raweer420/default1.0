const { Events } = require('discord.js');
const LogManager = require('../logger/logManager');

// Função que pode ser exportada e usada por comandos
async function logMessagePurge(client, channel, count, executor, reason = null) {
  try {
    await LogManager.sendLog(client, {
      title: '🧹 Mensagens Limpas por Comando',
      color: 'Orange',
      fields: [
        { name: '📝 Canal', value: `${channel.name} (<#${channel.id}>)`, inline: true },
        { name: '🔢 Quantidade', value: `${count} mensagens`, inline: true },
        { name: '👮 Executado por', value: `${executor.tag} (${executor.id})`, inline: true },
        { name: '📅 Data', value: LogManager.formatTimestamp(Date.now()), inline: true },
        { name: '📝 Motivo', value: reason || 'Nenhum motivo fornecido' }
      ]
    });
  } catch (error) {
    console.error('❌ Erro ao registrar limpeza de mensagens:', error);
  }
}

module.exports = {
  logMessagePurge,
  execute() {} // Função vazia para evitar erro, já que este não é um evento real
};