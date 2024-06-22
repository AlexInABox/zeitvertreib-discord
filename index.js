import { REST, Routes, Client, GatewayIntentBits, ApplicationCommandManager } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config()
import util from 'util';
import request from 'request';
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
];

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const AUTHORIZED_USER_ID = process.env.AUTHORIZED_USER_ID;

const rest = new REST({ version: '10' }).setToken(TOKEN);

try {
  console.log('Started refreshing application (/) commands.');

  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

  console.log('Successfully reloaded application (/) commands.');
} catch (error) {
  console.error(error);
}


const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});



const PANEL_APPLICATION_TOKEN = process.env.PANEL_APPLICATION_TOKEN;
const PANEL_CLIENT_TOKEN = process.env.PANEL_CLIENT_TOKEN;
const PANEL_BASE_URL = process.env.PANEL_BASE_URL;
const SERVER_APPLICATION_ID = process.env.SERVER_APPLICATION_ID;
const SERVER_CLIENT_ID = process.env.SERVER_CLIENT_ID;

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
    try{
      await reinstallServer(PANEL_BASE_URL, SERVER_APPLICATION_ID, PANEL_APPLICATION_TOKEN)
    } catch (e){
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
        try{
          await sendPowerEventToServer("start", PANEL_BASE_URL, SERVER_CLIENT_ID, PANEL_CLIENT_TOKEN)
        } catch (e){
          await interaction.editReply('Error: ' + e);
        }
        await interaction.editReply('Server has been successfully reinstalled!');
        return;
      }

      if (elapsedTime >= maxDuration) {
        clearInterval(interval);
        await interaction.editReply('Reinstallation process did not complete within the expected time frame.');
        return;
      }
    }, intervalDuration);
  }

  if (interaction.commandName === 'start') {
    if (!isUserAuthorized(interaction.user.id)) { //if not the owner
      await interaction.reply('You do not have permission to use this command.');
      return;
    }
    await interaction.reply('Starting server...');
    try{
      await sendPowerEventToServer("start", PANEL_BASE_URL, SERVER_CLIENT_ID, PANEL_CLIENT_TOKEN)
    } catch (e){
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
    try{
      await sendPowerEventToServer("stop", PANEL_BASE_URL, SERVER_CLIENT_ID, PANEL_CLIENT_TOKEN)
    } catch (e){
      await interaction.editReply('Error: ' + e);
    }

    await interaction.editReply(`Started server! Check status here: ${PANEL_BASE_URL}server/${SERVER_CLIENT_ID}`);
  }
});

async function sendPowerEventToServer(signal, BASE_URL, SERVER_CLIENT_ID, PANEL_CLIENT_TOKEN){
  const options = {
    'method': 'POST',
    'url': `${BASE_URL}api/client/servers/${SERVER_CLIENT_ID}/power`,
    'headers': {
      'Authorization': 'Bearer ' + PANEL_CLIENT_TOKEN,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    formData: {
      'signal': signal
    }
  };

  await request(options, function (error, response) {
    if (error) throw new Error(error);
  });
}

async function reinstallServer(BASE_URL, SERVER_APPLICATION_ID, PANEL_APPLICATION_TOKEN){
  const options = {
    'method': 'POST',
    'url': `${BASE_URL}api/application/servers/${SERVER_APPLICATION_ID}/reinstall`,
    'headers': {
      'Authorization': 'Bearer ' + PANEL_APPLICATION_TOKEN,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  await request(options, function (error, response) {
    if (error) throw new Error(error);
  });
}

async function isServerInstalling(BASE_URL, SERVER_CLIENT_ID, PANEL_CLIENT_TOKEN){
  const options = {
    'method': 'GET',
    'url': `${BASE_URL}api/client/servers/${SERVER_CLIENT_ID}/`,
    'headers': {
      'Authorization': 'Bearer ' + PANEL_CLIENT_TOKEN,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
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

function isUserAuthorized(userID) {
  return userID === AUTHORIZED_USER_ID;
}

client.login(TOKEN);