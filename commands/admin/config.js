// commands/admin/config.js
const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const ServerConfig = require('../../utils/serverConfig');

module.exports = {
  name: 'config',
  description: 'Configurar o bot para este servidor',
  aliases: ['settings', 'configurar'],
  usage: '<view|set|reset> [opção] [valor]',
  category: 'Admin',
  permissions: 'Administrator',
  cooldown: 5,
  
  async execute(message, args, client) {
    // Verificar permissões do usuário
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Você precisa ter permissão de Administrador para usar este comando.');
    }
    
    const guildId = message.guild.id;
    
    // Se não houver argumentos, mostrar a ajuda
    if (!args.length) {
      return showHelp(message, client);
    }
    
    const subCommand = args[0].toLowerCase();
    
    switch (subCommand) {
      case 'view':
      case 'ver':
      case 'show':
      case 'mostrar':
        return showConfig(message, client);
        
      case 'set':
      case 'definir':
        if (args.length < 3) {
          return message.reply('❌ Uso incorreto! Use: `!config set <opção> <valor>`');
        }
        return setConfig(message, args.slice(1), client);
        
      case 'reset':
      case 'resetar':
        return resetConfig(message, client);
        
      case 'toggle':
      case 'alternar':
        if (args.length < 3) {
          return message.reply('❌ Uso incorreto! Use: `!config toggle <tipo> <opção>`');
        }
        return toggleOption(message, args.slice(1), client);
        
      default:
        return showHelp(message, client);
    }
  }
};

// Mostrar a ajuda do comando
async function showHelp(message, client) {
  const prefix = client.config?.PREFIX || '!';
  
  const embed = new EmbedBuilder()
    .setTitle('⚙️ Configuração do Bot')
    .setColor('#3498db')
    .setDescription(`Este comando permite configurar várias opções do bot para este servidor.`)
    .addFields(
      { name: '📝 Ver Configurações', value: `\`${prefix}config view\`` },
      { name: '⚙️ Definir Configuração', value: `\`${prefix}config set <opção> <valor>\`` },
      { name: '🔄 Resetar Configurações', value: `\`${prefix}config reset\`` },
      { name: '🔘 Alternar Opção', value: `\`${prefix}config toggle <tipo> <opção>\`` },
      { name: '📋 Opções Disponíveis', value: 
        '`prefix` - Prefixo de comandos\n' +
        '`logChannel` - Canal para logs\n' +
        '`welcomeChannel` - Canal de boas-vindas\n' +
        '`autoRole` - Cargo automático para novos membros\n' +
        '`musicChannel` - Canal para comandos de música\n' +
        '`djRole` - Cargo de DJ com acesso a comandos especiais de música'
      },
      { name: '📋 Opções para Toggle', value: 
        '`logs` - Tipos: messages, voice, moderation, server, join, leave\n' +
        '`command` - Nome do comando a ser ativado/desativado\n' +
        '`modrole` - ID do cargo de moderação'
      },
      { name: '📝 Exemplos', value: 
        `\`${prefix}config set prefix ?\`\n` +
        `\`${prefix}config set logChannel #logs\`\n` +
        `\`${prefix}config toggle logs voice\`\n` +
        `\`${prefix}config toggle command music\``
      }
    )
    .setFooter({ text: 'Apenas administradores podem alterar as configurações' });
  
  return message.reply({ embeds: [embed] });
}

// Mostrar a configuração atual
async function showConfig(message, client) {
  const guildId = message.guild.id;
  const config = ServerConfig.getConfig(guildId);
  
  // Formatar canais e cargos para melhor visualização
  const formatChannel = (channelId) => {
    if (!channelId) return 'Não definido';
    return `<#${channelId}> (${channelId})`;
  };
  
  const formatRole = (roleId) => {
    if (!roleId) return 'Não definido';
    return `<@&${roleId}> (${roleId})`;
  };
  
  // Formatar tipos de logs
  const logsStatus = Object.entries(config.enabledLogs || {})
    .map(([type, enabled]) => `${type}: ${enabled ? '✅' : '❌'}`)
    .join('\n');
  
  // Formatar comandos desativados
  const disabledCommands = config.disabledCommands?.length
    ? config.disabledCommands.join(', ')
    : 'Nenhum comando desativado';
  
  // Formatar cargos de moderação
  const modRoles = config.modRoles?.length
    ? config.modRoles.map(id => `<@&${id}>`).join(', ')
    : 'Nenhum cargo configurado';
  
  const embed = new EmbedBuilder()
    .setTitle('⚙️ Configuração Atual')
    .setColor('#3498db')
    .setDescription(`Configuração atual do bot para o servidor **${message.guild.name}**`)
    .addFields(
      { name: '📝 Prefixo', value: config.prefix || '!', inline: true },
      { name: '📝 Canal de Logs', value: formatChannel(config.logChannel), inline: true },
      { name: '👋 Canal de Boas-vindas', value: formatChannel(config.welcomeChannel), inline: true },
      { name: '👤 Cargo Automático', value: formatRole(config.autoRole), inline: true },
      { name: '🎵 Canal de Música', value: formatChannel(config.musicChannel), inline: true },
      { name: '🎧 Cargo de DJ', value: formatRole(config.djRole), inline: true },
      { name: '📊 Status dos Logs', value: logsStatus },
      { name: '🚫 Comandos Desativados', value: disabledCommands },
      { name: '👮 Cargos de Moderação', value: modRoles }
    )
    .setTimestamp()
    .setFooter({ text: `ID do Servidor: ${guildId}` });
  
  return message.reply({ embeds: [embed] });
}

// Definir uma configuração
async function setConfig(message, args, client) {
  const guildId = message.guild.id;
  const option = args[0].toLowerCase();
  const value = args.slice(1).join(' ');
  
  // Verificar opção
  const validOptions = ['prefix', 'logchannel', 'welcomechannel', 'autorole', 'musicchannel', 'djrole'];
  if (!validOptions.includes(option)) {
    return message.reply(`❌ Opção inválida! Opções disponíveis: ${validOptions.join(', ')}`);
  }
  
  try {
    let newValue = value;
    
    // Processar diferentes tipos de opções
    switch (option) {
      case 'prefix':
        // Verificar tamanho do prefixo
        if (value.length > 3) {
          return message.reply('❌ O prefixo não pode ter mais de 3 caracteres!');
        }
        break;
        
      case 'logchannel':
      case 'welcomechannel':
      case 'musicchannel':
        // Processar ID do canal
        if (value.toLowerCase() === 'none' || value.toLowerCase() === 'nenhum') {
          newValue = null;
        } else {
          const channelId = value.replace(/[<#>]/g, '');
          const channel = message.guild.channels.cache.get(channelId);
          
          if (!channel) {
            return message.reply('❌ Canal não encontrado! Forneça um ID de canal válido ou mencione um canal.');
          }
          
          if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
            return message.reply('❌ O canal deve ser um canal de texto!');
          }
          
          newValue = channelId;
        }
        break;
        
      case 'autorole':
      case 'djrole':
        // Processar ID do cargo
        if (value.toLowerCase() === 'none' || value.toLowerCase() === 'nenhum') {
          newValue = null;
        } else {
          const roleId = value.replace(/[<@&>]/g, '');
          const role = message.guild.roles.cache.get(roleId);
          
          if (!role) {
            return message.reply('❌ Cargo não encontrado! Forneça um ID de cargo válido ou mencione um cargo.');
          }
          
          newValue = roleId;
        }
        break;
    }
    
    // Salvar configuração
    ServerConfig.setConfig(guildId, option, newValue);
    
    return message.reply(`✅ Configuração **${option}** atualizada com sucesso para \`${newValue === null ? 'Nenhum' : newValue}\`!`);
  } catch (error) {
    console.error(`❌ Erro ao definir configuração ${option}:`, error);
    return message.reply(`❌ Ocorreu um erro ao definir a configuração: ${error.message}`);
  }
}

// Resetar as configurações
async function resetConfig(message, client) {
  const guildId = message.guild.id;
  
  // Confirmar ação
  const confirmMsg = await message.reply('⚠️ Tem certeza que deseja resetar todas as configurações do bot para este servidor? Responda com **sim** para confirmar.');
  
  // Coletar resposta
  const filter = m => m.author.id === message.author.id && m.content.toLowerCase() === 'sim';
  const collector = message.channel.createMessageCollector({ filter, time: 15000, max: 1 });
  
  collector.on('collect', async () => {
    try {
      // Resetar configurações
      ServerConfig.resetConfig(guildId);
      
      await message.reply('✅ Todas as configurações foram resetadas para os valores padrão!');
    } catch (error) {
      console.error('❌ Erro ao resetar configurações:', error);
      await message.reply(`❌ Ocorreu um erro ao resetar as configurações: ${error.message}`);
    }
  });
  
  collector.on('end', collected => {
    if (collected.size === 0) {
      message.reply('⏱️ Tempo esgotado. Operação cancelada.');
    }
  });
}

// Alternar opções (logs, comandos, cargos de moderação)
async function toggleOption(message, args, client) {
  const guildId = message.guild.id;
  const optionType = args[0].toLowerCase();
  const option = args[1].toLowerCase();
  
  try {
    switch (optionType) {
      case 'logs':
        // Verificar se é um tipo de log válido
        const validLogTypes = ['messages', 'voice', 'moderation', 'server', 'join', 'leave'];
        if (!validLogTypes.includes(option)) {
          return message.reply(`❌ Tipo de log inválido! Tipos disponíveis: ${validLogTypes.join(', ')}`);
        }
        
        // Alternar status
        const newStatus = ServerConfig.toggleLog(guildId, option);
        return message.reply(`✅ Logs de **${option}** foram ${newStatus ? 'ativados' : 'desativados'}!`);
        
      case 'command':
        // Verificar se o comando existe
        const command = client.commands.get(option) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(option));
        if (!command) {
          return message.reply('❌ Comando não encontrado!');
        }
        
        // Verificar se o comando já está desativado
        const isDisabled = ServerConfig.isCommandDisabled(guildId, command.name);
        
        if (isDisabled) {
          // Ativar comando
          ServerConfig.enableCommand(guildId, command.name);
          return message.reply(`✅ Comando **${command.name}** foi ativado!`);
        } else {
          // Desativar comando
          ServerConfig.disableCommand(guildId, command.name);
          return message.reply(`✅ Comando **${command.name}** foi desativado!`);
        }
        
      case 'modrole':
        // Processar ID do cargo
        const roleId = option.replace(/[<@&>]/g, '');
        const role = message.guild.roles.cache.get(roleId);
        
        if (!role) {
          return message.reply('❌ Cargo não encontrado! Forneça um ID de cargo válido.');
        }
        
        // Verificar se já é um cargo de moderação
        const isModRole = ServerConfig.isModRole(guildId, roleId);
        
        if (isModRole) {
          // Remover cargo de moderação
          ServerConfig.removeModRole(guildId, roleId);
          return message.reply(`✅ Cargo **${role.name}** foi removido da lista de cargos de moderação!`);
        } else {
          // Adicionar cargo de moderação
          ServerConfig.addModRole(guildId, roleId);
          return message.reply(`✅ Cargo **${role.name}** foi adicionado à lista de cargos de moderação!`);
        }
        
      default:
        return message.reply('❌ Tipo de opção inválido! Tipos disponíveis: logs, command, modrole');
    }
  } catch (error) {
    console.error(`❌ Erro ao alternar opção ${optionType} ${option}:`, error);
    return message.reply(`❌ Ocorreu um erro ao alternar a opção: ${error.message}`);
  }
}