import { Client, EmbedBuilder as MessageEmbed, GatewayIntentBits, REST, Routes, ActivityType } from 'discord.js';
import dotenv from 'dotenv';
import util from 'util';
import request from 'request';
import Pterodactyl from './lib/Pterodactyl.js';
import BotCommands from './lib/BotCommands.js';

dotenv.config()

const requestPromise = util.promisify(request);

const AUTHORIZED_USER_IDS = process.env.AUTHORIZED_USER_IDS;
const PANEL_APPLICATION_TOKEN = process.env.PANEL_APPLICATION_TOKEN;
const PANEL_BASE_URL = process.env.PANEL_BASE_URL;
const PANEL_CLIENT_TOKEN = process.env.PANEL_CLIENT_TOKEN;
const SERVER_APPLICATION_ID = process.env.SERVER_APPLICATION_ID;
const SERVER_CLIENT_ID = process.env.SERVER_CLIENT_ID;
const TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

BotCommands.init(client);

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // Function to update bot activity with player count
  async function updateActivity() {
    let { playerCount, success, errorMsg } = await getPlayerCount();

    if (!success) {
      client.user.setActivity(errorMsg, { type: ActivityType.Custom });
      client.user.setStatus("dnd");
      console.error("[ERR] Failed updating activity: " + errorMsg + " (Status: dnd)");
      return;
    }

    client.user.setActivity(`${playerCount} Spieler online.`, { type: ActivityType.Watching });
    // Set status to idle when there is no player playing; set to online if there are players online (Note: Discord takes time to update statuses!)
    client.user.setStatus(playerCount == 0 ? "idle" : "online");
    console.log("updated activity to " + playerCount + " (Status: " + client.user.presence.status + ")");
  }

  // Update activity initially
  await updateActivity();

  // Set interval to update activity every 5 minutes (300000 milliseconds)
  setInterval(async () => {
    await updateActivity();
  }, 15000); // Adjust interval as needed
});




BotCommands.registerCommand("ping", async (interaction) => {
  await interaction.reply('Pong!');
})

BotCommands.registerCommand("reinstall", async (interaction) => {
  if (!isUserAuthorized(interaction.user.id)) { //if not the owner
    await interaction.reply('You do not have permission to use this command.');
    return;
  }
  await interaction.reply('Reinstalling...');
  try {
    await reinstallServer(PANEL_BASE_URL, SERVER_APPLICATION_ID, PANEL_APPLICATION_TOKEN)
  } catch (e) {
    await interaction.editReply('Error: ' + e);
  }

  await interaction.editReply(`Reinstalling server. Please wait...`);

  const maxDuration = 2 * 60 * 1000; // 2 minutes in milliseconds
  const intervalDuration = 5 * 1000; // 5 seconds in milliseconds
  let elapsedTime = 0;

  const interval = setInterval(async () => {
    elapsedTime += intervalDuration;

    if (!await isServerInstalling(PANEL_BASE_URL, SERVER_CLIENT_ID, PANEL_CLIENT_TOKEN)) {
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
BotCommands.registerCommand("playerlist", async (interaction) => {
  await interaction.reply('Trying to fetch playlist. Please wait...');

  try {
    let { success, players, errorMsg } = await getPlayerList();

    if (!success) {
      console.error("[ERR] Caught error while running /playerlist: " + errorMsg);

      const embed = new MessageEmbed()
        .setTitle("Playerlist - Error")
        .setDescription(errorMsg + "  😔")
        .setColor("#9141ac")
        .setFooter({
          text: "SCP: Zeitvertreib",
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      return;
    }

    if (players.length === 0) {
      const embed = new MessageEmbed()
        .setTitle("Playerlist")
        .setDescription("No players online right now. 😔")
        .setColor("#9141ac")
        .setFooter({
          text: "SCP: Zeitvertreib",
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else {
      let playerList = players.map(player => `- ${player}`).join('\n');

      const embed = new MessageEmbed()
        .setTitle("Playerlist")
        .setDescription(playerList)
        .setColor("#9141ac")
        .setFooter({
          text: "SCP: Zeitvertreib",
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  } catch (e) {
    await interaction.editReply('Error: ' + e);
    console.log(e)
  }
})

async function getPlayerCount() {
  let instanceId = process.env.CEDMOD_INSTANCE_ID;

  const options = {
    'method': 'OPTIONS',
    'url': `https://queryws.cedmod.nl/Api/Realtime/QueryServers/GetPopulation?instanceId=${instanceId}`,
    'headers': {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  const rawResponse = await requestPromise(options);
  if (!rawResponse.body || rawResponse.body.length < 2)
    return {
      success: false,
      errorMsg: "CedMod unavailable!"
    };

  let response;

  try {
    response = JSON.parse(rawResponse.body);
  } catch (e) {
    return {
      success: false,
      errorMsg: "Failed retrieving playerlist!"
    };
  }
  if (!response || !response[0])
    return {
      success: false,
      errorMsg: "Server unavailable!"
    };

  return {
    success: true,
    playerCount: response[0].playerCount,
  };
}

async function getPlayerList() {
  let instanceId = process.env.CEDMOD_INSTANCE_ID;

  const options = {
    'method': 'OPTIONS',
    'url': `https://queryws.cedmod.nl/Api/Realtime/QueryServers/GetPopulation?instanceId=${instanceId}`,
    'headers': {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  const rawResponse = await requestPromise(options);

  if (!rawResponse.body || rawResponse.body.length < 2)
    return {
      success: false,
      errorMsg: "CedMod did not respond with any data!"
    };

  let response;

  try {
    response = JSON.parse(rawResponse.body);
  } catch (e) {
    return {
      success: false,
      errorMsg: "CedMod did respond with invalid JSON!"
    };
  }

  if (!response || !response[0])
    return {
      success: false,
      errorMsg: "The server is currently not available!"
    };

  return {
    success: true,
    players: response[0].userIds,
  };
}

function isUserAuthorized(userID) {
  return AUTHORIZED_USER_IDS.includes(userID);
}

client.login(TOKEN);