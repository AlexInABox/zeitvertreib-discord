import { Client, EmbedBuilder as MessageEmbed, GatewayIntentBits, ActivityType } from 'discord.js';
import { promises as fs } from 'fs';
import dotenv from 'dotenv';
import Pterodactyl from './lib/Pterodactyl.js';
import BotCommands from './lib/BotCommands.js';
import ServerStatsManager from './lib/ServerStatsManager.js';

dotenv.config()


const AUTHORIZED_USER_IDS = process.env.AUTHORIZED_USER_IDS;
const PANEL_APPLICATION_TOKEN = process.env.PANEL_APPLICATION_TOKEN;
const PANEL_BASE_URL = process.env.PANEL_BASE_URL;
const PANEL_CLIENT_TOKEN = process.env.PANEL_CLIENT_TOKEN;
const SCP_SERVER_TIMEOUT = Number.parseInt(process.env.SCP_SERVER_TIMEOUT) | 300_000;
const SERVER_APPLICATION_ID = process.env.SERVER_APPLICATION_ID;
const SERVER_CLIENT_ID = process.env.SERVER_CLIENT_ID;
const TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let serverStats = {};
readServerStats();

const setStatus = (status, text, activity = ActivityType.Watching) => {
  client.user.setActivity(text, { type: activity });
  client.user.setStatus(status);
}

const generateDiscordTimestamp = (time = Date.now()) => `<t:${Math.floor(time / 1000)}:R>`

async function writeServerStats() {
  await fs.writeFile('./var/serverStats.json', JSON.stringify(serverStats, null, 2));
}
async function readServerStats() {
  try {
  serverStats = JSON.parse(await fs.readFile('./var/serverStats.json', 'utf-8'));
  } catch (e) {
    console.error("Failed to read serverStats.json");
    console.log("Rebuilding serverStats.json...");
    serverStats = {
      state: "offline",
      playerCount: 0,
      playerList: [],
      timestamp: Date.now(),
      provider: "silly kittens"
    }
    await writeServerStats();
  }
}

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`)

  setStatus("dnd", "Warte auf Server", ActivityType.Custom);

  setInterval(async () => {
    await readServerStats();

    if (serverStats.state == "offline") {
      setStatus("dnd", "Server offline", ActivityType.Custom);
      return;
    }

    if (serverStats.timestamp + SCP_SERVER_TIMEOUT <= Date.now()) {
      setStatus("dnd", "Verbindung verloren :(", ActivityType.Custom);
      return;
    }

    if (serverStats.playerCount > 0) {
      // "Schaut 10 Spielern zu." "Schaut 1 Spieler zu."
      setStatus("online", `${serverStats.playerCount} Spieler${serverStats.playerCount == 1 ? "" : "n"} zu.`);
    } else {
      setStatus("idle", "Warte auf Spieler ...", ActivityType.Custom);
    }
  }, 5000) // every 5 seconds
});
ServerStatsManager.mainloop();



BotCommands.init(client);

client.login(TOKEN);

// ------------ Base 
const isUserAuthorized = (userID) => AUTHORIZED_USER_IDS.includes(userID);

BotCommands.registerCommand("ping", async (interaction) => {
  await interaction.deferReply();
  await interaction.reply('Pong!');
})


// ------------ Playerlist

BotCommands.registerCommand("playerlist", async (interaction) => {
  await interaction.deferReply();


  if (serverStats.state == "offline") {
    const embed = new MessageEmbed()
      .setTitle("SERVER OFFLINE " + generateDiscordTimestamp(serverStats.timestamp))
      .setColor("#ff787f")
      .setFooter({
        text: "SCP: Zeitvertreib | " + (serverStats.provider || "silly kittens"),
      });

    await interaction.reply({ embeds: [embed] });

  } else if (serverStats.playerList.length == 0 && serverStats.playerCount > 0) { //Data from SCPListKr. all other sources failed
    const embed = new MessageEmbed()
      .setTitle(`${serverStats.playerCount} players are online! ` + generateDiscordTimestamp(serverStats.timestamp))
      .setDescription("Server list is unanvailable... 😔")
      .setColor("#9141ac")
      .setFooter({
        text: "SCP: Zeitvertreib | " + (serverStats.provider || "silly kittens"),
      });

    await interaction.reply({ embeds: [embed] });

  } else if (serverStats.playerList.length == 0) {
    const embed = new MessageEmbed()
      .setTitle("Playerlist " + generateDiscordTimestamp(serverStats.timestamp))
      .setDescription("No players online right now. 😔")
      .setColor("#9141ac")
      .setFooter({
        text: "SCP: Zeitvertreib | " + (serverStats.provider || "silly kittens"),
      });

    await interaction.reply({ embeds: [embed] });

  } else {
    let embededPlayerList = serverStats.playerList.map(player => `- ${player}`).join('\n');

    const embed = new MessageEmbed()
      .setTitle("Playerlist " + generateDiscordTimestamp(serverStats.timestamp))
      .setDescription(embededPlayerList)
      .setColor("#9141ac")
      .setFooter({
        text: "SCP: Zeitvertreib | " + (serverStats.provider || "silly kittens"),
      });

    await interaction.reply({ embeds: [embed] });
  }
})

// ------------ Pterodactyl

BotCommands.registerCommand("reinstall", async (interaction) => {
  await interaction.deferReply();

  if (!isUserAuthorized(interaction.user.id)) { //if not the owner
    await interaction.reply('You do not have permission to use this command.');
    return;
  }
  await interaction.reply('Reinstalling...');
  try {
    await Pterodactyl.reinstallServer(PANEL_BASE_URL, SERVER_APPLICATION_ID, PANEL_APPLICATION_TOKEN)
  } catch (e) {
    await interaction.editReply('Error: ' + e);
  }

  await interaction.editReply(`Reinstalling server. Please wait...`);

  const maxDuration = 2 * 60 * 1000; // 2 minutes in milliseconds
  const intervalDuration = 5 * 1000; // 5 seconds in milliseconds
  let elapsedTime = 0;

  const interval = setInterval(async () => {
    elapsedTime += intervalDuration;

    if (!await Pterodactyl.isServerInstalling(PANEL_BASE_URL, SERVER_CLIENT_ID, PANEL_CLIENT_TOKEN)) {
      clearInterval(interval);
      await interaction.editReply('Starting server...');
      try {
        await Pterodactyl.sendPowerEventToServer("start", PANEL_BASE_URL, SERVER_CLIENT_ID, PANEL_CLIENT_TOKEN)
      } catch (e) {
        await interaction.editReply('Error: ' + e);
      }
      await interaction.editReply('Server has been successfully reinstalled!');
      return;
    }

    if (elapsedTime >= maxDuration) {
      clearInterval(interval);
      await interaction.editReply('Reinstallation process did not complete within the expected time frame.');
    }
  }, intervalDuration);
})

BotCommands.registerCommand("restart", async (interaction) => {
  await interaction.deferReply();

  if (!isUserAuthorized(interaction.user.id)) { //if not the owner
    await interaction.reply('You do not have permission to use this command.');
    return;
  }
  await interaction.reply('Restarting server...');
  try {
    await Pterodactyl.sendPowerEventToServer("restart", PANEL_BASE_URL, SERVER_CLIENT_ID, PANEL_CLIENT_TOKEN)
  } catch (e) {
    await interaction.editReply('Error: ' + e);
  }

  await interaction.editReply(`Restarted server! Check status here: ${PANEL_BASE_URL}server/${SERVER_CLIENT_ID}`);
})
BotCommands.registerCommand("start", async (interaction) => {
  await interaction.deferReply();

  if (!isUserAuthorized(interaction.user.id)) { //if not the owner
    await interaction.reply('You do not have permission to use this command.');
    return;
  }
  await interaction.reply('Starting server...');
  try {
    await Pterodactyl.sendPowerEventToServer("start", PANEL_BASE_URL, SERVER_CLIENT_ID, PANEL_CLIENT_TOKEN)
  } catch (e) {
    await interaction.editReply('Error: ' + e);
  }

  await interaction.editReply(`Started server! Check status here: ${PANEL_BASE_URL}server/${SERVER_CLIENT_ID}`);
})
BotCommands.registerCommand("stop", async (interaction) => {
  await interaction.deferReply();
  
  if (!isUserAuthorized(interaction.user.id)) { //if not the owner
    await interaction.reply('You do not have permission to use this command.');
    return;
  }
  await interaction.reply('Stopping server...');
  try {
    await Pterodactyl.sendPowerEventToServer("stop", PANEL_BASE_URL, SERVER_CLIENT_ID, PANEL_CLIENT_TOKEN)
  } catch (e) {
    await interaction.editReply('Error: ' + e);
  }

  await interaction.editReply(`Stopped server! Check status here: ${PANEL_BASE_URL}server/${SERVER_CLIENT_ID}`);
})