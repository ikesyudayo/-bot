// 既存のindex.jsとマージする用の例（discord.js v14）
require('dotenv').config?.();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection, Events, MessageFlags } = require('discord.js');
const log = require('./system/log');
const { handleAuthSelect } = require('./system/auth');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,       // 特権: Developer Portalでオン
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,     // 特権: Developer Portalでオン
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

// commands/ 内を全部読み込む
client.commands = new Collection();
for (const file of fs.readdirSync(path.join(__dirname, 'commands')).filter((f) => f.endsWith('.js'))) {
  const cmd = require(`./commands/${file}`);
  client.commands.set(cmd.data.name, cmd);
}

log.register(client);
require('./system/voice').register(client);

client.once(Events.ClientReady, async (c) => {
  // GUILD_ID を設定するとサーバー限定で即反映される
  const body = client.commands.map((cmd) => cmd.data.toJSON());
  if (process.env.GUILD_ID) {
    await c.guilds.cache.get(process.env.GUILD_ID)?.commands.set(body);
  } else {
    await c.application.commands.set(body);
  }
  console.log(`ログイン完了: ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (await handleAuthSelect(interaction)) return;
    if (interaction.isChatInputCommand()) {
      await client.commands.get(interaction.commandName)?.execute(interaction);
    }
  } catch (err) {
    console.error(err);
    const msg = { content: '❌ エラーが起きた', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
    else await interaction.reply(msg).catch(() => {});
  }
});

client.login(process.env.DISCORD_TOKEN);
