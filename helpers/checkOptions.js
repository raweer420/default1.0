const { DisTube } = require('distube');
const { Client, GatewayIntentBits } = require('discord.js');

// Criar um cliente com os intents necessários
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages
  ]
});

try {
  // Tentar criar uma instância DisTube com diferentes configurações
  console.log("Tentando criar DisTube com configuração mínima...");
  const distube = new DisTube(client);
  console.log("✅ DisTube criado com sucesso!");
  
  // Tentar adicionar plugins
  console.log("\nTentando identificar opções válidas...");
  
  // Verificar métodos disponíveis
  console.log("\nMétodos disponíveis no DisTube:");
  const methods = Object.getOwnPropertyNames(DisTube.prototype)
    .filter(name => typeof DisTube.prototype[name] === 'function' && name !== 'constructor');
  console.log(methods);
  
  // Verificar eventos disponíveis
  console.log("\nEventos suportados pelo DisTube:");
  console.log(distube.listenerCount);
  
  console.log("\nDiagnostico completo. Você pode usar estas opções no seu DisTube.");
} catch (error) {
  console.error("Erro ao criar DisTube:", error);
}

// Não precisamos conectar o cliente