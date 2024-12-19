import CedMod from "./CedMod.js";
import SCPListKr from "./SCPListKr.js";
import DataTransmitServer from "./DataTransmitServer.js";
import Logging from "./Logging.js";
import { promises as fs } from "fs";
import dotenv from "dotenv";
dotenv.config();

let serverStats = {};
async function readServerStats() {
  serverStats = JSON.parse(
    await fs.readFile("./var/serverStats.json", "utf-8")
  );
}

const timeoutThreshold =
  Number.parseInt(process.env.SCP_SERVER_TIMEOUT) | 30000;
const instanceId = process.env.CEDMOD_INSTANCE_ID;
const whichCedmodServer = process.env.CEDMOD_WHICH_SERVER - 1;
const serverId = process.env.SCPLISTKR_SERVER_ID;

async function mainloop() {
  try {
    DataTransmitServer.initalize();
  } catch (e) {
    Logging.logError(
      "[ServerStatsManager] DataTransmitServer failed horribly. We are doomed."
    );
    Logging.logCritical("[DataTransmitServer] " + e);
  }

  //every 30 seconds check if the serverStats.json is still up to date
  setInterval(async () => {
    await readServerStats();
    if (serverStats.timestamp + timeoutThreshold <= Date.now()) {
      Logging.logWarning(
        "[ServerStatsManager] DataTransmitServer hasn't sent any data in the last 30 seconds. Trying to get player list from alternative sources..."
      );

      try {
        await CedMod.refreshPlayerList(instanceId, whichCedmodServer);
      } catch (e) {
        Logging.logError(
          "[ServerStatsManager] Failed to get player list from CedMod. Trying SCPListKr..."
        );
        Logging.logError("[CedMod] " + e);
      }

      await readServerStats();
      if (serverStats.timestamp + timeoutThreshold > Date.now()) {
        Logging.logInfo(
          "[ServerStatsManager] Successfully got player list from CedMod."
        );

        if (serverStats.playerCount > 0) {
          return;
        }
        Logging.logInfo(
          "[ServerStatsManager] Apparently there are no players on the server. I'm gonna ask SCPListKr just to be sure."
        );
      }

      try {
        await SCPListKr.refreshPlayerCount(serverId);
      } catch (e) {
        Logging.logError(
          "[ServerStatsManager] Failed to get player list from SCPListKr."
        );
        Logging.logError("[SCPListKr] " + e);
        return;
      }
      ogging.logError(
        "[ServerStatsManager] Successfully got player count from SCPListKr."
      );
      return;
    }
  }, 30000);
}

export default { mainloop };
