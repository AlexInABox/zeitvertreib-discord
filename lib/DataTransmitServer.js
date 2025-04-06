import express from "express";
import Logging from "./Logging.js";
import RoundReplays from "./RoundReplays.js";
const app = express();
app.use(express.json()); // for parsing application/json
app.use(express.text({ limit: "50mb" })); // Parses text/plain bodies
const port = 3000;

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

async function initalize() {
  app.post("/", async (req, res) => {
    if (req.body === undefined) {
      Logging.logWarning(
        "[DataTransmitServer] Received unrecognizable POST request: req.body is undefined"
      );
      return res.sendStatus(400);
    }
    if (req.body.PacketName === undefined) {
      Logging.logWarning(
        "[DataTransmitServer] Received unrecognizable POST request: req.body.PacketName is undefined"
      );
      return res.sendStatus(400);
    }
    if (typeof req.body.PacketName !== "string") {
      Logging.logWarning(
        "[DataTransmitServer] Received unrecognizable POST request: req.body.PacketName is not a string"
      );
      return res.sendStatus(400);
    }

    Logging.logInfo(
      "[DataTransmitServer] Sucessfully received packet via POST request: " +
      req.body.PacketName
    );

    const body = req.body;

    switch (body.PacketName) {
      case "Info":
        await readServerStats();
        serverStats.state = "";
        serverStats.playerCount = Number(body.PlayerCount) || 0;
        serverStats.playerList = body.Players || [];
        serverStats.provider = "DataTransmitServer";
        serverStats.timestamp = Date.now();
        await writeServerStats();
        break;
      case "RoundRestart":
        await readServerStats();
        serverStats.state = "Rundenneustart!";
        serverStats.timestamp = Date.now();
        await writeServerStats();
        break;
      case "ServerAvailable":
        await readServerStats();
        serverStats.state = "Warte auf Spieler...";
        serverStats.playerCount = 0;
        serverStats.playerList = [];
        serverStats.provider = "DataTransmitServer";
        serverStats.timestamp = Date.now();
        await writeServerStats();
        break;
      case "MapGenerated":
        await readServerStats();
        serverStats.state = "Warte auf Spieler...";
        serverStats.playerCount = 0;
        serverStats.playerList = [];
        serverStats.provider = "DataTransmitServer";
        serverStats.timestamp = Date.now();
        await writeServerStats();
        break;
      case "IdleMode":
        await readServerStats();
        serverStats.state = "Idle";
        serverStats.playerCount = 0;
        serverStats.playerList = [];
        serverStats.provider = "DataTransmitServer";
        serverStats.timestamp = Date.now();
        await writeServerStats();
        break;
      default:
        return res.sendStatus(405);
    }

    return res.sendStatus(200);
  });

  app.post("/roundReplays", async (req, res) => {
    RoundReplays.saveRoundReplay(req.body).then(() => {
      res.status(201).send("Round replay saved successfully");
    }).catch((error) => {
      Logging.logError("[RoundReplays] Error saving round replay: " + error.message);
      res.status(400).send("Failed to save round replay. Probably your fault.");
    });
  });

  app.listen(port);
}

export default { initalize };
