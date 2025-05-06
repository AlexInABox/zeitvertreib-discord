import { promisify } from "util";
import request from "request";
import { promises as fs } from "fs";
import dotenv from "dotenv";

dotenv.config();

const requestPromise = promisify(request);

interface ServerStats {
  state: string;
  playerCount: number;
  playerList: string[];
  provider: string;
  timestamp: number;
}

let serverStats: Partial<ServerStats> = {};

async function readServerStats(): Promise<void> {
  const data = await fs.readFile("./var/serverStats.json", "utf-8");
  serverStats = JSON.parse(data);
}

async function writeServerStats(): Promise<void> {
  await fs.writeFile("./var/serverStats.json", JSON.stringify(serverStats, null, 2));
}

async function refreshPlayerList(instanceId: number, whichServer: number): Promise<void> {
  const options = {
    method: "GET",
    url: `https://queryws.cedmod.nl/Api/Realtime/QueryServers/GetPopulation?instanceId=${instanceId}`,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };

  const rawResponse = await requestPromise(options) as request.Response;
  const body = rawResponse.body;

  if (!body || body.length < 2) {
    throw new Error("Empty response from CedMod!");
  }

  let response: any;
  try {
    response = JSON.parse(body);
  } catch {
    throw new Error("Failed to parse response from CedMod!");
  }

  const serverData = response?.[whichServer];
  if (!serverData || serverData.playerCount === undefined || !Array.isArray(serverData.userIds)) {
    throw new Error("Invalid response from CedMod!");
  }

  await readServerStats();

  serverStats = {
    state: "",
    playerCount: serverData.playerCount,
    playerList: serverData.userIds,
    provider: "CedMod",
    timestamp: Date.now(),
  };

  await writeServerStats();
}

export default { refreshPlayerList };
