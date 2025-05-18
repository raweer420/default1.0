// utils/serverConfig.js
const { ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

class ServerConfig {
  constructor() {
    this.configPath = path.join(__dirname, '..', 'data', 'serverConfig.json');
    this.defaults = {
      prefix: '!',
      logChannel: null,
      welcomeChannel: null,
      autoRole: null,
      musicChannel: null,
      djRole: null,
      modRoles: [],
      disabledCommands: [],
      enabledLogs: {
        messages: true,
        voice: true,
        moderation: true,
        server: true,
        join: true,
        leave: true
      }
    };
    
    this.configs = this.loadConfigs();
  }
  
  // Carregar configurações do arquivo JSON
  loadConfigs() {
    try {
      // Verificar se o diretório de dados existe
      const dataDir = path.join(__dirname, '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Verificar se o arquivo de configuração existe
      if (!fs.existsSync(this.configPath)) {
        fs.writeFileSync(this.configPath, JSON.stringify({}, null, 2));
        return {};
      }
      
      // Carregar e analisar o arquivo
      const data = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Erro ao carregar configurações dos servidores:', error);
      return {};
    }
  }
  
  // Salvar configurações no arquivo JSON
  saveConfigs() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.configs, null, 2));
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar configurações dos servidores:', error);
      return false;
    }
  }
  
  // Obter configuração de um servidor
  getConfig(guildId) {
    if (!this.configs[guildId]) {
      this.configs[guildId] = { ...this.defaults };
    }
    
    return this.configs[guildId];
  }
  
  // Definir uma configuração específica para um servidor
  setConfig(guildId, key, value) {
    if (!this.configs[guildId]) {
      this.configs[guildId] = { ...this.defaults };
    }
    
    this.configs[guildId][key] = value;
    return this.saveConfigs();
  }
  
  // Redefinir as configurações de um servidor para os valores padrão
  resetConfig(guildId) {
    this.configs[guildId] = { ...this.defaults };
    return this.saveConfigs();
  }
  
  // Verificar se o canal de logs está configurado
  getLogChannel(client, guildId) {
    const config = this.getConfig(guildId);
    if (!config.logChannel) return null;
    
    try {
      const channel = client.channels.cache.get(config.logChannel);
      if (channel && (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement)) {
        return channel;
      }
      return null;
    } catch (error) {
      console.error(`❌ Erro ao obter canal de logs para o servidor ${guildId}:`, error);
      return null;
    }
  }
  
  // Verificar se um tipo de log está ativado para o servidor
  isLogEnabled(guildId, logType) {
    const config = this.getConfig(guildId);
    return config.enabledLogs && config.enabledLogs[logType] === true;
  }
  
  // Ativar/desativar um tipo de log
  toggleLog(guildId, logType) {
    const config = this.getConfig(guildId);
    
    if (!config.enabledLogs) {
      config.enabledLogs = { ...this.defaults.enabledLogs };
    }
    
    config.enabledLogs[logType] = !config.enabledLogs[logType];
    this.saveConfigs();
    
    return config.enabledLogs[logType];
  }
  
  // Verificar se um comando está desativado no servidor
  isCommandDisabled(guildId, commandName) {
    const config = this.getConfig(guildId);
    return config.disabledCommands && config.disabledCommands.includes(commandName);
  }
  
  // Desativar um comando no servidor
  disableCommand(guildId, commandName) {
    const config = this.getConfig(guildId);
    
    if (!config.disabledCommands) {
      config.disabledCommands = [];
    }
    
    if (!config.disabledCommands.includes(commandName)) {
      config.disabledCommands.push(commandName);
      this.saveConfigs();
    }
    
    return true;
  }
  
  // Ativar um comando no servidor
  enableCommand(guildId, commandName) {
    const config = this.getConfig(guildId);
    
    if (!config.disabledCommands) {
      config.disabledCommands = [];
      return true;
    }
    
    const index = config.disabledCommands.indexOf(commandName);
    if (index !== -1) {
      config.disabledCommands.splice(index, 1);
      this.saveConfigs();
    }
    
    return true;
  }
  
  // Verificar se um cargo é um cargo de moderação
  isModRole(guildId, roleId) {
    const config = this.getConfig(guildId);
    return config.modRoles && config.modRoles.includes(roleId);
  }
  
  // Adicionar um cargo de moderação
  addModRole(guildId, roleId) {
    const config = this.getConfig(guildId);
    
    if (!config.modRoles) {
      config.modRoles = [];
    }
    
    if (!config.modRoles.includes(roleId)) {
      config.modRoles.push(roleId);
      this.saveConfigs();
    }
    
    return true;
  }
  
  // Remover um cargo de moderação
  removeModRole(guildId, roleId) {
    const config = this.getConfig(guildId);
    
    if (!config.modRoles) {
      config.modRoles = [];
      return true;
    }
    
    const index = config.modRoles.indexOf(roleId);
    if (index !== -1) {
      config.modRoles.splice(index, 1);
      this.saveConfigs();
    }
    
    return true;
  }
}

module.exports = new ServerConfig();