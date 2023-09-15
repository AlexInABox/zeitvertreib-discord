import { REST, Routes, Client, GatewayIntentBits, ApplicationCommandManager } from 'discord.js';

const commands = [
    {
        name: 'ping',
        description: 'Replies with Pong!',
    },
    {
        name: 'reinstall',
        description: 'Reinstalls the SCP:SL server.',
    },
];

const TOKEN = 'OTgwNTQyMjcwMzE3MTQ2MTEz.GfrfxF.Nj7oLAtY1SoPri3qHIngJRLiTUHFSsH8DkrVKc';
const CLIENT_ID = '980542270317146113';

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



const pTOKEN = "ptla_nLzCYtiYli8BPsSXLd1N9qDVUEkuPMUFuGY2JVNcU6K";
const pURL = "https://panel.alexinabox.de/api/application/servers/1/reinstall";
import fetch from 'node-fetch';

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong!');
    }

    if (interaction.commandName === 'reinstall') {
        //Check if user id is 428870593358594048
        if (interaction.user.id !== '428870593358594048') { //if not the owner
            await interaction.reply('You do not have permission to use this command.');
            return;
        }
        await interaction.reply('Reinstalling...');
        //Post request to pURL with pTOKEN as Authorization Bearer
        const headers = {
            "Authorization": "Bearer " + pTOKEN,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        const request = await fetch(pURL, { method: 'POST', headers: headers });
        var response;
        try {
            response = await request.json();
            if (response.errors) {
                await interaction.editReply('Error: ' + response.errors[0].detail);
                return;
            }
        } catch (error) {
            console.log("Success!");
        }

        await interaction.editReply('Reinstallation initiated. Check status here: https://panel.alexinabox.de/server/3ea2a591');
    }
});

client.login(TOKEN);