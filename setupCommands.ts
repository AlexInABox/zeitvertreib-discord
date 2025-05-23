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
  { name: "sync", description: "Syncronize your CedMod stats with the Zeitvertreib stats." },
  //{ name: "ddosfix", description: "Executing this command will fix **ANY** DDoS attack. Use this command only when necessary please!" }
];

// Get environment variables with fallbacks and error handling
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not defined`);
  }
  return value;
}

const TOKEN = getRequiredEnv("DISCORD_TOKEN");
const CLIENT_ID = getRequiredEnv("CLIENT_ID");
const GUILD_ID = getRequiredEnv("GUILD_ID");

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  Logging.logCritical("Missing required environment variables.");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

// Export constants that might be useful
export { COMMANDS, TOKEN, CLIENT_ID, GUILD_ID };

export async function deleteAllCommands() {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [] });
    Logging.logInfo("Successfully deleted all guild commands.");

    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
    Logging.logInfo("Successfully deleted all application commands.");
  } catch (error) {
    Logging.logError("Failed to delete all commands: " + error);
  }
}

export async function registerAllCommands() {
  try {
    Logging.logInfo("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: COMMANDS });
    Logging.logInfo("Successfully reloaded application (/) commands.");
  } catch (error) {
    Logging.logError("Failed to register commands: " + error);
  }
}

// Export a main function to set up commands
export async function setupCommands() {
  try {
    if (DELETE_BEFORE) await deleteAllCommands();
    await registerAllCommands();
    return true;
  } catch (error) {
    Logging.logError(`Error occurred during command setup: ${error}`);
    return false;
  }
}
