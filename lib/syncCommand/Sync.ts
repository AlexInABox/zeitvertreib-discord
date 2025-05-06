import Helper from "./Helper.js";
import SteamAuthentication from "./SteamAuthentication.js";
import BotCommands from "../BotCommands.js";
import Logging from "../Logging.js";
import { ChatInputCommandInteraction, Guild, User, TextChannel } from "discord.js";

BotCommands.registerCommand("sync", async (interaction: ChatInputCommandInteraction): Promise<void> => {
  await interaction.deferReply();
  await interaction.editReply("Trying my best...");

  try {
    const guild = interaction.guild as Guild;
    const user = interaction.user as User;

    const channelInfo = await Helper.createPrivateChannel(guild, user);
    await interaction.editReply(`Ticket erstellt <#${channelInfo.channel.id}>`);

    const message = await Helper.sendAuthenticationPrompt(channelInfo.channel, channelInfo.authCode);

    SteamAuthentication.run(channelInfo.authCode);

    const deleteTimeout = Helper.createAutoDeleteTimeout(channelInfo.channel, 5 * 60_000);
    const userId = await Helper.waitForUserId(channelInfo.authCode, deleteTimeout);

    await Helper.updateAuthenticationStatus(message);
    await channelInfo.channel.send("Bitte verwende nun den Befehl `/stats get`. Der Bot erledigt den Rest!");

    const userStatistics = await Helper.watchForStatsMessage(channelInfo.channel, userId);
    await Helper.writeToDatabase(userStatistics);
    await Helper.sendSuccessMessage(channelInfo.channel, userStatistics);
  } catch (e: any) {
    Logging.logError("[SYNC] " + e);
    await interaction.editReply("Fehler: " + e.message);
  }
});

export default {};
