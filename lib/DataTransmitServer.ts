import express from "express";
import { Request, Response } from "express";
import Logging from "./Logging.js";
import { promises as fs } from "fs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.text({ limit: "50mb" }));

interface ServerStats {
  state: string;
  playerCount: number;
  playerList: string[];
  provider: string;
  timestamp: number;
}

let serverStats: Partial<ServerStats> = {};

async function readServerStats() {
  const data = await fs.readFile("./var/serverStats.json", "utf-8");
  serverStats = JSON.parse(data);
}

async function writeServerStats() {
  await fs.writeFile("./var/serverStats.json", JSON.stringify(serverStats, null, 2));
}

app.post("/", async (req: Request, res: Response): Promise<void> => {
  const body = req.body;

  if (!body || typeof body.PacketName !== "string") {
    Logging.logWarning("[DataTransmitServer] Invalid POST request");
    res.sendStatus(400);
    return;
  }

  Logging.logInfo(`[DataTransmitServer] Received packet: ${body.PacketName}`);

  await readServerStats();
  const now = Date.now();

  switch (body.PacketName) {
    case "Info":
      serverStats = {
        state: "",
        playerCount: Number(body.PlayerCount) || 0,
        playerList: body.Players || [],
        provider: "DataTransmitServer",
        timestamp: now,
      };
      break;
    case "RoundRestart":
      serverStats.state = "Rundenneustart!";
      serverStats.timestamp = now;
      break;
    case "ServerAvailable":
    case "MapGenerated":
      serverStats = {
        state: "Warte auf Spieler...",
        playerCount: 0,
        playerList: [],
        provider: "DataTransmitServer",
        timestamp: now,
      };
      break;
    case "IdleMode":
      serverStats = {
        state: "Idle",
        playerCount: 0,
        playerList: [],
        provider: "DataTransmitServer",
        timestamp: now,
      };
      break;
    default:
      res.sendStatus(405);
      return;
  }

  await writeServerStats();
  res.sendStatus(200);
});

export default {
  initialize: () => app.listen(port),
};
