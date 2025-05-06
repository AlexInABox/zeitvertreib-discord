import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
import Logging from "./lib/Logging.js";

dotenv.config();

const DELETE_BEFORE = false;

const COMMANDS = [
  { name: "ping", description: "Replies with Pong!" },
  { name: "reinstall", description: "Reinstall the SCP:SL server." },
  { name: "restart", description: "Restart the SCP:SL server." },
  { name: "start", description: "Start the SCP:SL server." },
  { name: "stop", description: "Stop the SCP:SL server." },
  { name: "playerlist", description: "Get a list of players on the SCP:SL server." },
  { name: "sync", description: "Funny dev command." },
  { name: "ddosfix", description: "Executing this command will fix **ANY** DDoS attack. Use this command only when necessary please!" }
];

const TOKEN: string = process.env.DISCORD_TOKEN ?? (() => { throw new Error("DISCORD_TOKEN is not defined"); })();
const CLIENT_ID: string = process.env.CLIENT_ID ?? (() => { throw new Error("CLIENT_ID is not defined"); })();
const GUILD_ID: string = process.env.GUILD_ID ?? (() => { throw new Error("GUILD_ID is not defined"); })();

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  Logging.logCritical("Missing required environment variables.");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    if (DELETE_BEFORE) await deleteAllCommands();
    await registerAllCommands();
  } catch (error) {
    Logging.logError(`Error occurred: ${error}`);
  }
})();

async function deleteAllCommands() {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [] });
    Logging.logInfo("Successfully deleted all guild commands.");

    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
    Logging.logInfo("Successfully deleted all application commands.");
  } catch (error) {
    Logging.logError("Failed to delete all commands: " + error);
  }
}

async function registerAllCommands() {
  try {
    Logging.logInfo("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: COMMANDS });
    Logging.logInfo("Successfully reloaded application (/) commands.");
  } catch (error) {
    Logging.logError("Failed to register commands: " + error);
  }
}
