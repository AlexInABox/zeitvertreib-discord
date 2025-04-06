import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    EmbedBuilder as MessageEmbed,
    PermissionFlagsBits
} from "discord.js";
import SteamAuthentication from "./SteamAuthentication.js";
import Logging from "../Logging.js";

function generateRandomCode() {
    return Math.random().toString(36).substring(2, 8);
}

async function createPrivateChannel(guild, user) {
    const randomCode = generateRandomCode();
    const randomAuthCode = generateRandomCode();

    const channel = await guild.channels.create({
        name: `sync-${randomCode}`,
        type: ChannelType.GuildText,
        topic: 'Nutze dieses Ticket um deine CedMod Statistiken mit Zeitvertreib zu synchronisieren!',
        permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: '749684016550248490', type: 1, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        ],
    });

    setupDeleteButtonCollector(channel, user.id);

    return { channel, authCode: randomAuthCode };
}

async function sendAuthenticationPrompt(channel, authCode) {
    const embed = new MessageEmbed()
        .setTitle("🔒 Authentifizierung erforderlich")
        .setDescription("Status: 🔴 **NICHT AUTHENTIFIZIERT**")
        .setColor(0xed2a15);


    const loginButton = new ButtonBuilder()
        .setLabel("Mit Steam einloggen")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://dscbnd.zeitvertreib.vip/${authCode}/auth/login`);


    const deleteButton = new ButtonBuilder()
        .setCustomId("delete_channel")
        .setLabel("❌ Ticket löschen")
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(loginButton, deleteButton);
    return await channel.send({ embeds: [embed], components: [row] });
}

function setupDeleteButtonCollector(channel, userId) {
    const filter = (i) => i.customId === "delete_channel" && i.user.id === userId;
    const collector = channel.createMessageComponentCollector({ filter, time: 600_000 });

    collector.on("collect", async (i) => {
        await i.deferUpdate();
        await channel.delete().catch(console.error);
    });
}

function createAutoDeleteTimeout(channel, delayMs) {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (channel) channel.delete().catch(console.error);
            resolve();
        }, delayMs);
    });
}

async function updateAuthenticationStatus(message) {
    const embed = new MessageEmbed()
        .setTitle("🔒 Authentifizierung erfolgreich")
        .setDescription("Status: 🟢 **AUTHENTIFIZIERT**")
        .setColor(0x2ecc71);


    const deleteButton = new ButtonBuilder()
        .setCustomId("delete_channel")
        .setLabel("❌ Ticket löschen")
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(deleteButton);
    await message.edit({ embeds: [embed], components: [row] });
}

function extractPlayerStats(embed, userId) {
    if (!embed || embed.data.title !== 'Player Stats') return null;

    const stats = {};
    const descMatch = embed.data.description.match(/\*\*(\d+)\*\*/);
    if (descMatch) stats.roundsplayed = parseInt(descMatch[1]);

    for (const field of embed.data.fields) {
        const value = field.value.replace(/\*\*/g, '');
        switch (field.name) {
            case 'Kills': stats.kills = parseInt(value); break;
            case 'Deaths': stats.deaths = parseInt(value); break;
            case 'XP': stats.experience = parseInt(value.replace(' XP', '')); break;
            case 'Level': stats.level = parseInt(value); break;
            case 'Medkits Used': stats.usedmedkits = parseInt(value); break;
            case 'Colas Consumed': stats.usedcolas = parseInt(value); break;
            case 'Pocket Dimension Escapes': stats.pocketescapes = parseInt(value); break;
            case 'Adrenaline Shots': stats.usedadrenaline = parseInt(value); break;
        }
    }

    stats.id = userId;
    return stats;
}

async function waitForUserId(randomAuthCode, deleteTimeout) {
    return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
            const userId = SteamAuthentication.prefixMap.get(randomAuthCode);
            Logging.logInfo(randomAuthCode + ": " + userId);
            if (userId !== null && userId !== undefined) {
                clearInterval(checkInterval);
                resolve(userId);
            }
        }, 100); // Check every 100ms

        deleteTimeout.then(() => {
            clearInterval(checkInterval);
            reject(new Error("Ticket deleted before user authentication."));
        });
    });
}

function delay(ms) {
    return new Promise((res) => setTimeout(res, ms));
}

async function watchForStatsMessage(channel, userId) {
    return new Promise((resolve) => {
        const collector = channel.client.on("messageCreate", async (message) => {
            if (message.author.id !== "749684016550248490") return;
            if (message.channel.id !== channel.id) return;

            await delay(3000); // allow time for embeds to load

            if (!message.embeds || message.embeds.length === 0) return;
            const embed = message.embeds[0];
            if (embed.data.title !== "Player Stats") return;

            const stats = extractPlayerStats(embed, userId);
            if (stats) {
                resolve(stats);
            }
        });
    });
}

async function sendSuccessMessage(channel, userStatistics) {
    // Send pretty JSON in code block
    await channel.send(`\`\`\`json\n${JSON.stringify(userStatistics, null, 2)}\n\`\`\``);

    // Send confirmation embed
    const successEmbed = new MessageEmbed()
        .setTitle("✅ Synchronisation abgeschlossen")
        .setDescription("Deine Statistiken wurden erfolgreich synchronisiert.\nDu kannst sie bald auf [deinem Dashboard](https://dev.zeitvertreib.vip/dashboard) sehen.")
        .setColor(0x2ecc71);

    await channel.send({ embeds: [successEmbed] });
}



export default {
    createPrivateChannel,
    sendAuthenticationPrompt,
    setupDeleteButtonCollector,
    createAutoDeleteTimeout,
    updateAuthenticationStatus,
    extractPlayerStats,
    waitForUserId,
    delay,
    watchForStatsMessage,
    sendSuccessMessage,
};
