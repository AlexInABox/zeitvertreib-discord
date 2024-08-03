import { Client, EmbedBuilder as MessageEmbed, GatewayIntentBits, ActivityType } from 'discord.js';
import dotenv from 'dotenv';
import Pterodactyl from './lib/Pterodactyl.js';
import BotCommands from './lib/BotCommands.js';
import DataTransmitServer from "./lib/DataTransmitServer.js";

dotenv.config()


const AUTHORIZED_USER_IDS = process.env.AUTHORIZED_USER_IDS;
const ENDPOINT_URL = process.env.ENDPOINT_URL;
const PANEL_APPLICATION_TOKEN = process.env.PANEL_APPLICATION_TOKEN;
const PANEL_BASE_URL = process.env.PANEL_BASE_URL;
const PANEL_CLIENT_TOKEN = process.env.PANEL_CLIENT_TOKEN;
const SERVER_APPLICATION_ID = process.env.SERVER_APPLICATION_ID;
const SERVER_CLIENT_ID = process.env.SERVER_CLIENT_ID;
const TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let players = [];
let lastData = Date.now();

const setStatus = (status, text, activity = ActivityType.Watching) => {
  client.user.setActivity(text, { type: activity });
  client.user.setStatus(status);
}

client.on('ready', async () => console.log(`Logged in as ${client.user.tag}!`));

BotCommands.init(client);

const isUserAuthorized = (userID) => AUTHORIZED_USER_IDS.includes(userID);

DataTransmitServer.openServer(80, ENDPOINT_URL);

DataTransmitServer.registerPacketListener("*", (_) => lastData = Date.now())

DataTransmitServer.registerPacketListener("Info", (packet) => {
  players = packet.Players;
  const playerCount = packet.PlayerCount;

  if (playerCount > 0)
    setStatus("online", `${playerCount} Spieler${playerCount == 1 ? "" : "n"} zu.`);
  else
    setStatus("idle", "Warte auf Spieler ...", ActivityType.Custom);

})

DataTransmitServer.registerPacketListener("RoundRestart", (_) => {
  setStatus("dnd", "Rundenneustart", ActivityType.Custom);
})

DataTransmitServer.registerPacketListener("ServerAvailable", (_) => {
  setStatus("idle", "Warte auf Spieler ...", ActivityType.Custom);
})


client.login(TOKEN);

// ------------ Base 

BotCommands.registerCommand("ping", async (interaction) => {
  await interaction.reply('Pong!');
})


// ------------ Playerlist

BotCommands.registerCommand("playerlist", async (interaction) => {

  if (players.length === 0) {
    const embed = new MessageEmbed()
      .setTitle("Playerlist")
      .setDescription("No players online right now. 😔")
      .setColor("#9141ac")
      .setFooter({
        text: "SCP: Zeitvertreib",
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } else {
    let playerList = players.map(player => `- ${player}`).join('\n');

    const embed = new MessageEmbed()
      .setTitle(`Playerlist (${players.length})`)
      .setDescription(playerList)
      .setColor("#9141ac")
      .setFooter({
        text: "SCP: Zeitvertreib",
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
})

// ------------ Pterodactyl

BotCommands.registerCommand("reinstall", async (interaction) => {
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