import {
  Client,
  Events,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder as MessageEmbed,
  GatewayIntentBits,
  ActivityType,
  PresenceStatusData,
  ChatInputCommandInteraction
} from "discord.js";
import { promises as fs } from "fs";
import dotenv from "dotenv";
import Pterodactyl from "./lib/Pterodactyl.js";
import BotCommands from "./lib/BotCommands.js";
import ServerStatsManager from "./lib/ServerStatsManager.js";
import Logging from "./lib/Logging.js";
import "./lib/syncCommand/Sync.js";
import DDoSFix from "./lib/ddospanic/index.js"

dotenv.config();

const AUTHORIZED_USER_IDS: string[] = process.env.AUTHORIZED_USER_IDS?.split(",") || [];
const PANEL_APPLICATION_TOKEN: string = process.env.PANEL_APPLICATION_TOKEN || "";
const PANEL_BASE_URL: string = process.env.PANEL_BASE_URL || "";
const PANEL_CLIENT_TOKEN: string = process.env.PANEL_CLIENT_TOKEN || "";
const SCP_SERVER_TIMEOUT: number = Number.parseInt(process.env.SCP_SERVER_TIMEOUT || "300000");
const SERVER_APPLICATION_ID: number = Number.parseInt(process.env.SERVER_APPLICATION_ID || "0");
const SERVER_CLIENT_ID: number = Number.parseInt(process.env.SERVER_CLIENT_ID || "0");
const TOKEN: string = process.env.DISCORD_TOKEN || "";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

interface ServerStats {
  state: string;
  playerCount: number;
  playerList: string[];
  timestamp: number;
  provider: string;
}

export let serverStats: ServerStats = {
  state: "offline",
  playerCount: 0,
  playerList: [],
  timestamp: Date.now(),
  provider: "silly kittens",
};

readServerStats();

const setStatus = (status: PresenceStatusData, text: string, activity = ActivityType.Watching) => {
  if (client.user) {
    client.user.setActivity(text, { type: activity });
    client.user.setStatus(status);
  } else {
    Logging.logCritical("Client user is null. Unable to set activity or status.");
  }
};

const generateDiscordTimestamp = (time = Date.now()) =>
  `<t:${Math.floor(time / 1000)}:R>`;

async function writeServerStats() {
  await fs.mkdir("./var", { recursive: true });
  await fs.writeFile(
    "./var/serverStats.json",
    JSON.stringify(serverStats, null, 2)
  );
}

async function readServerStats() {
  try {
    serverStats = JSON.parse(
      await fs.readFile("./var/serverStats.json", "utf-8")
    );
  } catch (e) {
    Logging.logError("Failed to read serverStats.json");
    Logging.logInfo("Rebuilding serverStats.json...");
    serverStats = {
      state: "offline",
      playerCount: 0,
      playerList: [],
      timestamp: Date.now(),
      provider: "silly kittens",
    };
    await writeServerStats();
  }
}

client.on("ready", async () => {
  if (client.user) {
    Logging.logInfo(`Logged in as ${client.user.tag}!`);
  } else {
    Logging.logCritical("Client user is null. Unable to log in.");
  }

  setStatus("dnd", "Warte auf Server", ActivityType.Custom);

  setInterval(async () => {
    await readServerStats();

    if (serverStats.state === "offline") {
      setStatus("dnd", "Server offline", ActivityType.Custom);
      return;
    }

    if (serverStats.timestamp + SCP_SERVER_TIMEOUT <= Date.now()) {
      setStatus("dnd", "Verbindung verloren :(", ActivityType.Custom);
      return;
    }

    if (serverStats.playerCount > 0) {
      setStatus(
        "online",
        `${serverStats.playerCount} Spieler${serverStats.playerCount === 1 ? "" : "n"} zu.`
      );
    } else {
      setStatus("idle", "Warte auf Spieler ...", ActivityType.Custom);
    }
  }, 5000);
});

ServerStatsManager.mainloop();
BotCommands.init(client);
client.login(TOKEN);

// Command Handling
const isUserAuthorized = (userID: string) => AUTHORIZED_USER_IDS.includes(userID);

BotCommands.registerCommand("ping", async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();
  await interaction.editReply("Pong!");
});

BotCommands.registerCommand("playerlist", async (interaction: ChatInputCommandInteraction) => {
  let attempts = 0;
  const maxAttempts = 5;
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  while (attempts < maxAttempts) {
    try {
      await interaction.deferReply();

      if (serverStats.state === "offline") {
        const embed = new MessageEmbed()
          .setTitle(
            "SERVER OFFLINE " + generateDiscordTimestamp(serverStats.timestamp)
          )
          .setColor("#ff787f")
          .setFooter({
            text: "SCP: Zeitvertreib | " + (serverStats.provider || "silly kittens"),
          });

        await interaction.editReply({ embeds: [embed] });
      } else if (serverStats.playerList.length === 0 && serverStats.playerCount > 0) {
        const embed = new MessageEmbed()
          .setTitle(
            `${serverStats.playerCount} players are online! ` +
            generateDiscordTimestamp(serverStats.timestamp)
          )
          .setDescription("Server list is unavailable... 😔")
          .setColor("#9141ac")
          .setFooter({
            text: "SCP: Zeitvertreib | " + (serverStats.provider || "silly kittens"),
          });

        await interaction.editReply({ embeds: [embed] });
      } else if (serverStats.playerList.length === 0) {
        const embed = new MessageEmbed()
          .setTitle(
            "Playerlist " + generateDiscordTimestamp(serverStats.timestamp)
          )
          .setDescription("No players online right now. 😔")
          .setColor("#9141ac")
          .setFooter({
            text: "SCP: Zeitvertreib | " + (serverStats.provider || "silly kittens"),
          });

        await interaction.editReply({ embeds: [embed] });
      } else {
        const embededPlayerList = serverStats.playerList
          .map((player) => `- ${player}`)
          .join("\n");

        const embed = new MessageEmbed()
          .setTitle(
            "Playerlist " + generateDiscordTimestamp(serverStats.timestamp)
          )
          .setDescription(embededPlayerList)
          .setColor("#9141ac")
          .setFooter({
            text: "SCP: Zeitvertreib | " + (serverStats.provider || "silly kittens"),
          });

        await interaction.editReply({ embeds: [embed] });
      }
      return;
    } catch (error) {
      attempts++;
      if (attempts < maxAttempts) {
        Logging.logError(`Attempt ${attempts} failed. Retrying in 1 second... Error: ${error}`);
        await delay(1000);
      } else {
        Logging.logCritical(`All attempts failed. Error: ${error}`);
        await interaction.editReply({
          content: "An error occurred while fetching the player list. Please try again later.",
        });
      }
    }
  }
});

BotCommands.registerCommand("reinstall", async (interaction: ChatInputCommandInteraction) => {
  if (!isUserAuthorized(interaction.user.id)) {
    await interaction.deferReply();
    await interaction.editReply("You do not have permission to use this command.");
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId("reinstall")
    .setTitle("Formular für die Neuinstallation des Servers");

  const reasonInput = new TextInputBuilder()
    .setCustomId("reason")
    .setLabel("Was ist der Grund für die Neuinstallation?")
    .setMinLength(10)
    .setRequired(true)
    .setStyle(TextInputStyle.Paragraph);

  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
  modal.addComponents(firstActionRow);

  await interaction.showModal(modal);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isModalSubmit() || !interaction.isFromMessage()) return;
  if (interaction.customId === "reinstall") {
    await interaction.deferReply();

    const reason = interaction.fields.getTextInputValue("reason");
    if (/cedmod/i.test(reason)) {
      await interaction.editReply("Keine Neuinstallation kann CedMod fixen. Wir können nur abwarten :3");
      return;
    }

    await interaction.editReply("Reinstalling...");
    try {
      await Pterodactyl.reinstallServer(
        PANEL_BASE_URL,
        SERVER_APPLICATION_ID,
        PANEL_APPLICATION_TOKEN
      );
    } catch (e) {
      Logging.logError("Failed trying to reinstall server " + e);
      await interaction.editReply("Error: " + e);
      return;
    }

    await interaction.editReply(`Reinstalling server. Please wait...`);

    const maxDuration = 2 * 60 * 1000; // 2 minutes in milliseconds
    const intervalDuration = 5 * 1000; // 5 seconds in milliseconds
    let elapsedTime = 0;

    const interval = setInterval(async () => {
      elapsedTime += intervalDuration;

      if (!(await Pterodactyl.isServerInstalling(
        PANEL_BASE_URL,
        SERVER_CLIENT_ID,
        PANEL_CLIENT_TOKEN
      ))
      ) {
        clearInterval(interval);
        await interaction.editReply("Starting server...");
        try {
          await Pterodactyl.sendPowerEventToServer(
            "start",
            PANEL_BASE_URL,
            SERVER_CLIENT_ID,
            PANEL_CLIENT_TOKEN
          );
        } catch (e) {
          await interaction.editReply("Error: " + e);
        }
        await interaction.editReply("Server has been successfully reinstalled! Reason: " + reason);
        return;
      }

      if (elapsedTime >= maxDuration) {
        clearInterval(interval);
        await interaction.editReply("Reinstallation process did not complete within the expected time frame.");
      }
    }, intervalDuration);
  }
});

BotCommands.registerCommand("restart", async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();

  if (!isUserAuthorized(interaction.user.id)) {
    await interaction.editReply("You do not have permission to use this command.");
    return;
  }

  await interaction.editReply("Restarting server...");
  try {
    await Pterodactyl.sendPowerEventToServer(
      "restart",
      PANEL_BASE_URL,
      SERVER_CLIENT_ID,
      PANEL_CLIENT_TOKEN
    );
  } catch (e) {
    await interaction.editReply("Error: " + e);
  }

  await interaction.editReply(`Restarted server! Check status here: ${PANEL_BASE_URL}server/${SERVER_CLIENT_ID}`);
});

BotCommands.registerCommand("start", async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();

  if (!isUserAuthorized(interaction.user.id)) {
    await interaction.editReply("You do not have permission to use this command.");
    return;
  }

  await interaction.editReply("Starting server...");
  try {
    await Pterodactyl.sendPowerEventToServer(
      "start",
      PANEL_BASE_URL,
      SERVER_CLIENT_ID,
      PANEL_CLIENT_TOKEN
    );
  } catch (e) {
    await interaction.editReply("Error: " + e);
  }

  await interaction.editReply(`Started server! Check status here: ${PANEL_BASE_URL}server/${SERVER_CLIENT_ID}`);
});

BotCommands.registerCommand("stop", async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();

  if (!isUserAuthorized(interaction.user.id)) {
    await interaction.editReply("You do not have permission to use this command.");
    return;
  }

  await interaction.editReply("Stopping server...");
  try {
    await Pterodactyl.sendPowerEventToServer(
      "stop",
      PANEL_BASE_URL,
      SERVER_CLIENT_ID,
      PANEL_CLIENT_TOKEN
    );
  } catch (e) {
    await interaction.editReply("Error: " + e);
  }

  await interaction.editReply(`Stopped server! Check status here: ${PANEL_BASE_URL}server/${SERVER_CLIENT_ID}`);
});

let lastDdosFixTimestamp = 0; // Global timestamp

/*
BotCommands.registerCommand("ddosfix", async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();

  const userId = interaction.user.id;
  let roleIds: string[] = [];
  if (interaction.member && "roles" in interaction.member) {
    const roles = interaction.member.roles;
    if (Array.isArray(roles)) {
      roleIds = roles;
    } else if (typeof roles.cache === "object") {
      roleIds = Array.from(roles.cache.keys());
    }
  }

  const isAuthorized = isUserAuthorized(userId) || roleIds.some(id => isUserAuthorized(id));

  if (!isAuthorized) {
    await interaction.editReply("You do not have permission to use this command.");
    return;
  }

  // DISABLE COMAND FOR NOW
  await interaction.editReply(`⏳ This command is currently disabled. Try again next week maybe...`);
  return;

  const now = Date.now();
  const FIVE_MINUTES = 5 * 60 * 1000;

  if (now - lastDdosFixTimestamp < FIVE_MINUTES) {
    const minutesLeft = Math.ceil((FIVE_MINUTES - (now - lastDdosFixTimestamp)) / 60000);
    await interaction.editReply(`⏳ Please wait ${minutesLeft} more minute(s) before using this command again.`);
    return;
  }

  lastDdosFixTimestamp = now;

  await interaction.editReply("Executing DDoS fix...");

  try {
    await DDoSFix.ddosFixWithDiscordFeedback((msg) => interaction.editReply(msg));
  } catch (e) {
    Logging.logError("Failed trying to fix DDoS attack " + e);
    return;
  }

  Logging.logInfo("DDoS fix executed successfully.");
});
*/