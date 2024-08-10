
let callbacks = {};

const init = client => {
    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        if (callbacks[interaction.commandName] != undefined) {

            try {
                callbacks[interaction.commandName](interaction);
            } catch (e) {
                let err = String("Command: /" + interaction.commandName + " faild: \n" + e.stack);
                console.error(err);
                interaction.channel.send({ embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle("Ein Fehler ist aufgetreten!").setDescription(err.substring(0, 1900))] });
            }
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