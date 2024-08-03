
let callbacks = {};

const init = client => {

    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        if (callbacks[interaction.commandName] != undefined) {

            callbacks[interaction.commandName](interaction);

            return;
        }
    });
}

/**
 * Registers a command 
 * @param {String} command 
 * @param {(import("discord.js").Interaction) => {}} callback 
 */
const registerCommand = (command, callback) => {
    callbacks[command] = callback;
}

export default { init, registerCommand };