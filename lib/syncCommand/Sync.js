import Helper from "./Helper.js";
import SteamAuthentication from "./SteamAuthentication.js"
import BotCommands from "../BotCommands.js";
import Logging from "../Logging.js";

BotCommands.registerCommand("sync", async (interaction) => {
  await interaction.deferReply();
  await interaction.editReply("Trying my best...");

  try {
    const guild = interaction.guild;
    const user = interaction.user;
    const channelInfo = await Helper.createPrivateChannel(guild, user);
    await interaction.editReply(`Ticket erstellt <#${channelInfo.channel.id}>`);

    const message = await Helper.sendAuthenticationPrompt(channelInfo.channel, channelInfo.authCode);

    // Start Steam authentication server-side
    SteamAuthentication.run(channelInfo.authCode);

    const deleteTimeout = Helper.createAutoDeleteTimeout(channelInfo.channel, 5 * 60_000); // 5 minutes
    const userId = await Helper.waitForUserId(channelInfo.authCode, deleteTimeout);

    // User is now authenticated - yippie!
    await Helper.updateAuthenticationStatus(message);
    await channelInfo.channel.send("Bitte verwende nun den Befehl `/stats get`. Der Bot erledigt den Rest!");

    const userStatistics = await Helper.watchForStatsMessage(channelInfo.channel, userId);

    await Helper.writeToDatabase(userStatistics)

    await Helper.sendSuccessMessage(channelInfo.channel, userStatistics);
  } catch (e) {
    console.error(e);
    await interaction.editReply("Fehler: " + e.message);
  }
});

export default {};