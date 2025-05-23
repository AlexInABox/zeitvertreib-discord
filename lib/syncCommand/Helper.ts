import fetch from 'node-fetch';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    EmbedBuilder,
    Guild,
    PermissionFlagsBits,
    TextChannel,
    User,
    Message,
    Embed,
} from 'discord.js';
import SteamAuthentication from './SteamAuthentication.js';
import Logging from '../Logging.js';

function generateRandomCode(): string {
    return Math.random().toString(36).substring(2, 8);
}

async function createPrivateChannel(guild: Guild, user: User) {
    const randomCode = generateRandomCode();
    const randomAuthCode = generateRandomCode();

    const channel = await guild.channels.create({
        name: `sync-${randomCode}`,
        type: ChannelType.GuildText,
        topic: 'Nutze dieses Ticket um deine CedMod Statistiken mit Zeitvertreib zu synchronisieren!',
        permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            {
                id: '749684016550248490',
                type: 1,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            },
        ],
    });

    setupDeleteButtonCollector(channel as TextChannel, user.id);

    return { channel: channel as TextChannel, authCode: randomAuthCode };
}

async function sendAuthenticationPrompt(channel: TextChannel, authCode: string) {
    const embed = new EmbedBuilder()
        .setTitle('🔒 Authentifizierung erforderlich')
        .setDescription('Status: 🔴 **NICHT AUTHENTIFIZIERT**')
        .setColor(0xed2a15);

    const loginButton = new ButtonBuilder()
        .setLabel('Mit Steam einloggen')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://dscbcnd.zeitvertreib.vip/${authCode}/auth/login`);

    const deleteButton = new ButtonBuilder()
        .setCustomId('delete_channel')
        .setLabel('❌ Ticket löschen')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(loginButton, deleteButton);

    return await channel.send({ embeds: [embed], components: [row] });
}

function setupDeleteButtonCollector(channel: TextChannel, userId: string) {
    const filter = (i: any) => i.customId === 'delete_channel' && i.user.id === userId;
    const collector = channel.createMessageComponentCollector({ filter, time: 600_000 });

    collector.on('collect', async (i) => {
        await i.deferUpdate();
        await channel.delete().catch(console.error);
    });
}

function createAutoDeleteTimeout(channel: TextChannel, delayMs: number) {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            if (channel) channel.delete().catch(console.error);
            resolve();
        }, delayMs);
    });
}

async function updateAuthenticationStatus(message: Message) {
    const embed = new EmbedBuilder()
        .setTitle('🔒 Authentifizierung erfolgreich')
        .setDescription('Status: 🟢 **AUTHENTIFIZIERT**')
        .setColor(0x2ecc71);

    const deleteButton = new ButtonBuilder()
        .setCustomId('delete_channel')
        .setLabel('❌ Ticket löschen')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(deleteButton);

    await message.edit({ embeds: [embed], components: [row] });
}

type PlayerStats = {
    kills?: number;
    deaths?: number;
    experience?: number;
    roundsplayed?: number;
    level?: number;
    usedmedkits?: number;
    usedcolas?: number;
    usedadrenaline?: number;
    pocketescapes?: number;
    id: string;
};

function extractPlayerStats(embed: Embed, userId: string): PlayerStats | null {
    if (!embed || embed.title !== 'Player Stats') return null;

    const stats: PlayerStats = { id: userId };

    const descMatch = embed.description?.match(/\*\*(\d+)\*\*/);
    if (descMatch) stats.roundsplayed = parseInt(descMatch[1]);

    for (const field of embed.fields ?? []) {
        const value = field.value.replace(/\*\*/g, '');
        switch (field.name) {
            case 'Kills':
                stats.kills = parseInt(value);
                break;
            case 'Deaths':
                stats.deaths = parseInt(value);
                break;
            case 'XP':
                stats.experience = parseInt(value.replace(' XP', ''));
                break;
            case 'Level':
                stats.level = parseInt(value);
                break;
            case 'Medkits Used':
                stats.usedmedkits = parseInt(value);
                break;
            case 'Colas Consumed':
                stats.usedcolas = parseInt(value);
                break;
            case 'Pocket Dimension Escapes':
                stats.pocketescapes = parseInt(value);
                break;
            case 'Adrenaline Shots':
                stats.usedadrenaline = parseInt(value);
                break;
        }
    }

    return stats;
}

async function waitForUserId(authCode: string, deleteTimeout: Promise<void>): Promise<string> {
    return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
            const userId = SteamAuthentication.prefixMap.get(authCode);
            Logging.logInfo(authCode + ': ' + userId);
            if (userId != null) {
                clearInterval(interval);
                resolve(userId);
            }
        }, 100);

        deleteTimeout.then(() => {
            clearInterval(interval);
            reject(new Error('Ticket deleted before user authentication.'));
        });
    });
}

function delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

async function watchForStatsMessage(channel: TextChannel, userId: string): Promise<PlayerStats> {
    return new Promise((resolve) => {
        const listener = async (message: Message) => {
            if (
                message.author.id !== '749684016550248490' ||
                message.channel.id !== channel.id ||
                message.embeds.length === 0
            )
                return;

            await delay(3000); // wait for embeds to load

            const stats = extractPlayerStats(message.embeds[0], userId);
            if (stats) {
                channel.client.off('messageCreate', listener);
                resolve(stats);
            }
        };

        channel.client.on('messageCreate', listener);
    });
}

async function sendSuccessMessage(channel: TextChannel, stats: PlayerStats) {
    await channel.send(`\`\`\`json\n${JSON.stringify(stats, null, 2)}\n\`\`\``);

    const embed = new EmbedBuilder()
        .setTitle('✅ Synchronisation abgeschlossen')
        .setDescription(
            'Deine Statistiken wurden erfolgreich synchronisiert.\nDu kannst sie bald auf [deinem Dashboard](https://dev.zeitvertreib.vip/dashboard) sehen.'
        )
        .setColor(0x2ecc71);

    await channel.send({ embeds: [embed] });
}

async function writeToDatabase(stats: PlayerStats): Promise<void> {
    const baseUrl = process.env.DATABASE_URL;
    const id = stats.id;

    if (!baseUrl || !id) {
        Logging.logError('DATABASE_URL or player ID is missing.');
        throw new Error('DATABASE_URL or player ID is missing.');
    }

    const endpoints: Record<string, string> = {
        kills: 'kills',
        deaths: 'deaths',
        experience: 'experience',
        roundsplayed: 'roundsplayed',
        level: 'level',
        usedmedkits: 'usedmedkits',
        usedcolas: 'usedcolas',
        usedadrenaline: 'usedadrenaline',
        pocketescapes: 'pocketescapes',
    };

    for (const key in endpoints) {
        if (stats[key as keyof PlayerStats] !== undefined) {
            const url = `${baseUrl}/update/${endpoints[key]}`;
            const body = { id, [key]: stats[key as keyof PlayerStats] };

            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });

                if (res.ok) {
                    Logging.logInfo(`Updated ${key} successfully.`);
                } else {
                    Logging.logWarning(`Failed to update ${key}: ${res.statusText}`);
                }
            } catch (err) {
                Logging.logError(`Error updating ${key}: ${err}`);
                throw new Error('Fehler beim Hochladen der Statistiken in die Datenbank!');
            }
        }
    }
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
    writeToDatabase,
};
