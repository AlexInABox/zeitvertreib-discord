import CedMod from "./CedMod.js";
import SCPListKr from "./SCPListKr.js";


const NEW_LINE = "µ";
const PLAYER_COUNT = "%i";
const defaultPlayers = `Spielerzahl: ${PLAYER_COUNT}${NEW_LINE}Die Spieler können im${NEW_LINE}Moment nicht abgerufen werden${NEW_LINE} ----------- ${NEW_LINE}Versuche es später${NEW_LINE}nocheinmal`

/**
 * 
 * @returns {{provider?, playerCount?, playerList?, error?}}
 */
const tryGetPlayerList = async (cedModInstance, scpListInstance) => {
    let { playerCount, players, success } = await CedMod.requestData(cedModInstance);

    if (success)
        return { provider: "cedmod", playerCount, playerList: players };

    const scplistkr = await SCPListKr.getRequestPromise(scpListInstance).catch(console.error);

    if (!scplistkr.players)
        return { error: "Server ist nicht verfügbar" };

    const scpListKrPlayerCount = Number.parseInt(scplistkr.players.split("/")[0]);

    const scpListKrPlayers = defaultPlayers.replace(PLAYER_COUNT, scpListKrPlayerCount).split(NEW_LINE);

    return { provider: "scplist.kr", playerCount: scpListKrPlayerCount, playerList: scpListKrPlayers };
}

export default { tryGetPlayerList };