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

async function refreshPlayerList(instanceId) {
  const options = {
    method: "GET",
    url: `https://queryws.cedmod.nl/Api/Realtime/QueryServers/GetPopulation?instanceId=${instanceId}`,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };

  const rawResponse = await requestPromise(options);
  if (!rawResponse.body || rawResponse.body.length < 2) {
    throw new Error("Empty response from CedMod!");
  }

  let response;

  try {
    response = JSON.parse(rawResponse.body);
  } catch (e) {
    throw new Error("Failed to parse response from CedMod!");
  }
  if (
    !response ||
    !response[0] ||
    response[0].playerCount === undefined ||
    response[0].userIds === undefined
  )
    throw new Error("Invalid response from CedMod!");

  await readServerStats();

  serverStats.state = "";
  serverStats.playerCount = response[0].playerCount || 0;
  serverStats.playerList = response[0].userIds || [];
  serverStats.provider = "CedMod";
  serverStats.timestamp = Date.now();

  await writeServerStats();
}

export default { refreshPlayerList };
