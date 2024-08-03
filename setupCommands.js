// should all commands be deleted before being registered
const DELETE_BEFORE = false;

// Commands to be defined
const COMMANDS = [
    {
      name: 'ping',
      description: 'Replies with Pong!',
    },
    {
      name: 'reinstall',
      description: 'Reinstall the SCP:SL server.',
    },
    {
      name: 'restart',
      description: 'Restart the SCP:SL server.',
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
      name: 'playerlist',
      description: 'Get a list of players on the SCP:SL server.',
    }
  ];
  

import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

if(!process.env.DISCORD_TOKEN) {
  console.warn("Could not register discord commands since no token was found!");
  return;  
}

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const rest = new REST({ version: '10' }).setToken(TOKEN);

try {
    if (DELETE_BEFORE) await deleteAllCommands();
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

    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: COMMANDS });

    console.log('Successfully reloaded application (/) commands.');
}
