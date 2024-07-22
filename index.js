import { Client, EmbedBuilder as MessageEmbed, GatewayIntentBits, REST, Routes, ActivityType } from 'discord.js';
import dotenv from 'dotenv';
import util from 'util';
import request from 'request';

dotenv.config()

const requestPromise = util.promisify(request);

const commands = [
  {
    name: 'ping',
    description: 'Replies with Pong!',
  },
  {
    name: 'reinstall',
    description: 'Reinstall the SCP:SL server.',
  },
  {
    name: 'start',
    description: 'Start the SCP:SL server.',
  },
  {
    name: 'stop',
    description: 'Stop the SCP:SL server.',
  },
  {
    name: 'playercount',
    description: 'Get the playercount of the SCP:SL server.',
  },
  {
    name: 'playerlist',
    description: 'Get a list of players on the SCP:SL server.',
  }
];

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const AUTHORIZED_USER_ID = process.env.AUTHORIZED_USER_ID;

const rest = new REST({ version: '10' }).setToken(TOKEN);

try {

  //await deleteAllCommands();
  await registerAllCommands();

} catch (error) {
  console.error(error);
}

async function deleteAllCommands() {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [] })
    .then(() => console.log('Successfully deleted all guild commands.'))
    .catch(console.error);

  // for global commands
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] })
    .then(() => console.log('Successfully deleted all application commands.'))
    .catch(console.error);
}

async function registerAllCommands() {
  console.log('Started refreshing application (/) commands.');

  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

  console.log('Successfully reloaded application (/) commands.');
}


const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // Function to update bot activity with player count
  async function updateActivity() {
    let { playerCount, success, errorMsg } = await getPlayerCount();;

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


const PANEL_APPLICATION_TOKEN = process.env.PANEL_APPLICATION_TOKEN;
const PANEL_CLIENT_TOKEN = process.env.PANEL_CLIENT_TOKEN;
const PANEL_BASE_URL = process.env.PANEL_BASE_URL;
const SERVER_APPLICATION_ID = process.env.SERVER_APPLICATION_ID;
const SERVER_CLIENT_ID = process.env.SERVER_CLIENT_ID;

const CEDMOD_BASE_URL = process.env.CEDMOD_BASE_URL;

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }

  if (interaction.commandName === 'reinstall') {
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
          await sendPowerEventToServer("start", PANEL_BASE_URL, SERVER_CLIENT_ID, PANEL_CLIENT_TOKEN)
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
  }

  if (interaction.commandName === 'start') {
    if (!isUserAuthorized(interaction.user.id)) { //if not the owner
      await interaction.reply('You do not have permission to use this command.');
      return;
    }
    await interaction.reply('Starting server...');
    try {
      await sendPowerEventToServer("start", PANEL_BASE_URL, SERVER_CLIENT_ID, PANEL_CLIENT_TOKEN)
    } catch (e) {
      await interaction.editReply('Error: ' + e);
    }

    await interaction.editReply(`Started server! Check status here: ${PANEL_BASE_URL}server/${SERVER_CLIENT_ID}`);
  }

  if (interaction.commandName === 'stop') {
    if (!isUserAuthorized(interaction.user.id)) { //if not the owner
      await interaction.reply('You do not have permission to use this command.');
      return;
    }
    await interaction.reply('Starting server...');
    try {
      await sendPowerEventToServer("stop", PANEL_BASE_URL, SERVER_CLIENT_ID, PANEL_CLIENT_TOKEN)
    } catch (e) {
      await interaction.editReply('Error: ' + e);
    }

    await interaction.editReply(`Started server! Check status here: ${PANEL_BASE_URL}server/${SERVER_CLIENT_ID}`);
  }

  if (interaction.commandName === 'playercount') {
    await interaction.reply('Trying to fetch playercount. Please wait...');

    try {
      let { playerCount, success, errorMsg } = await getPlayerCount();

      if (!success) {
        await interaction.editReply("Failed retrieving playercount: " + errorMsg);
        return;
      }

      if (playerCount === 1) await interaction.editReply(playerCount + " player is online right now!");
      else await interaction.editReply(playerCount + " players are online right now!");
    } catch (e) {
      await interaction.editReply('Error: ' + e);
      console.log(e)
    }
  }

  if (interaction.commandName === 'playerlist') {
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
  }
});

async function sendPowerEventToServer(signal, BASE_URL, SERVER_CLIENT_ID, PANEL_CLIENT_TOKEN) {
  const options = {
    method: 'POST',
    url: `${BASE_URL}api/client/servers/${SERVER_CLIENT_ID}/power`,
    headers: {
      'Authorization': 'Bearer ' + PANEL_CLIENT_TOKEN,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    form: {
      'signal': signal
    },
    jar: false // Disable cookie jar to prevent saving and sending cookies
  };

  request(options, function (error, response, body) {
    if (error) throw new Error(error);
    console.log(body);
  });
}

async function reinstallServer(BASE_URL, SERVER_APPLICATION_ID, PANEL_APPLICATION_TOKEN) {
  const options = {
    'method': 'POST',
    'url': `${BASE_URL}api/application/servers/${SERVER_APPLICATION_ID}/reinstall`,
    'headers': {
      'Authorization': 'Bearer ' + PANEL_APPLICATION_TOKEN,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cookie': null,
      'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
      'Pragma':'no-cache'
    }
  };

  await request(options, function (error) {
    if (error) throw new Error(error);
  });
}

async function isServerInstalling(BASE_URL, SERVER_CLIENT_ID, PANEL_CLIENT_TOKEN) {
  const options = {
    'method': 'GET',
    'url': `${BASE_URL}api/client/servers/${SERVER_CLIENT_ID}/`,
    'headers': {
      'Authorization': 'Bearer ' + PANEL_CLIENT_TOKEN,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    jar: false // Disable cookie jar to prevent saving and sending cookies
  };

  try {
    const response = await requestPromise(options);
    const isInstalling = JSON.parse(response.body).attributes.is_installing;
    return isInstalling === true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

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
  return userID === AUTHORIZED_USER_ID;
}

client.login(TOKEN);