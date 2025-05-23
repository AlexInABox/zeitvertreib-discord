import util from "util";
import request from "request";
import { promises as fs } from "fs";
import dotenv from "dotenv";

dotenv.config();

const requestPromise = util.promisify(request);

interface ServerStats {
  state: string;
  playerCount: number;
  playerList: string[];
  provider: string;
  timestamp: number;
  [key: string]: any;
}

let serverStats: ServerStats = {
  state: "offline",
  playerCount: 0,
  playerList: [],
  provider: "",
  timestamp: 0
};

async function readServerStats(): Promise<void> {
  try {
    serverStats = JSON.parse(
      await fs.readFile("./var/serverStats.json", "utf-8")
    );
  } catch (e) {
    console.error("Failed to read serverStats.json:", e);
  }
}

async function writeServerStats(): Promise<void> {
  try {
    await fs.writeFile(
      "./var/serverStats.json",
      JSON.stringify(serverStats, null, 2)
    );
  } catch (e) {
    console.error("Failed to write serverStats.json:", e);
  }
}

interface SCPListKrResponse {
  players?: string;
  status?: number;
  online?: boolean;
  [key: string]: any;
}

async function refreshPlayerCount(serverId: number): Promise<void> {
  const options = {
    method: "GET",
    url: `https://api.scplist.kr/api/servers/${serverId}`,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };

  const rawResponse = await requestPromise(options);

  if (!rawResponse.body || rawResponse.body.length < 2) {
    throw new Error("Empty response from SCPListKr!");
  }

  let response: SCPListKrResponse;
  try {
    response = JSON.parse(rawResponse.body);
  } catch (e) {
    throw new Error("Failed to parse response from SCPListKr!");
  }

  // Fixed: Corrected the condition checking for undefined players
  if (!response || response.players === undefined) {
    throw new Error("Invalid response from SCPListKr!");
  }

  if (response.status === 400) {
    throw new Error("Invalid server ID!");
  }

  await readServerStats();

  serverStats.state = response.online ? "online" : "offline";
  serverStats.playerCount = Number(response.players.split("/")[0]);
  serverStats.playerList = [];
  serverStats.provider = "SCPListKr";
  serverStats.timestamp = Date.now();

  await writeServerStats();
}

export default { refreshPlayerCount };