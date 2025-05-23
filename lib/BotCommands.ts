import {
  Client,
  EmbedBuilder,
  ChatInputCommandInteraction
} from "discord.js";

let callbacks: { [key: string]: (interaction: ChatInputCommandInteraction) => Promise<void> | void } = {};

const init = (client: Client) => {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (callbacks[interaction.commandName] !== undefined) {
      try {
        await callbacks[interaction.commandName](interaction);
      } catch (e) {
        const err = String(
          "Command: /" + interaction.commandName + " failed: \n" + (e instanceof Error ? e.stack : String(e))
        );
        console.error(err);

        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xff0000)
                  .setTitle("Ein Fehler ist aufgetreten!")
                  .setDescription(err.substring(0, 1900)),
              ],
              ephemeral: true
            });
          } else {
            await interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xff0000)
                  .setTitle("Ein Fehler ist aufgetreten!")
                  .setDescription(err.substring(0, 1900)),
              ],
              ephemeral: true
            });
          }
        } catch (replyError) {
          console.error("Failed to send error message:", replyError);
        }
      }
      return;
    }
  });
};

const registerCommand = (command: string, callback: (interaction: ChatInputCommandInteraction) => Promise<void> | void) => {
  callbacks[command] = callback;
};

export default { init, registerCommand };