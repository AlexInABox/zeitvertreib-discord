import util from "util";
import request from "request";
const requestPromise = util.promisify(request);

import { promises as fs } from "fs";
import dotenv from "dotenv";
dotenv.config();

let serverStats = {};
async function readServerStats() {
  serverStats = JSON.parse(
    await fs.readFile("./var/serverStats.json", "utf-8")
  );
}
async function writeServerStats() {
  await fs.writeFile(
    "./var/serverStats.json",
    JSON.stringify(serverStats, null, 2)
  );
}

async function refreshPlayerCount(serverId) {
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

  let response;

  try {
    response = JSON.parse(rawResponse.body);
  } catch (e) {
    throw new Error("Failed to parse response from SCPListKr!");
  }

  if (!response || !response.players === undefined) {
    throw new Error("Invalid response from SCPListKr!");
  }

  if (response.status == 400) {
    throw new Error("Invalid server ID!");
  }

  await readServerStats();

  serverStats.state = "";
  if (!response.online) {
    serverStats.state = "offline";
  }
  serverStats.playerCount = Number(response.players.split("/")[0]);
  serverStats.playerList = [];
  serverStats.provider = "SCPListKr";
  serverStats.timestamp = Date.now();

  await writeServerStats();
}

export default { refreshPlayerCount };
