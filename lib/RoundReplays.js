import Logging from "./Logging.js";
import fs from 'fs';

import GifEncoder from "gifencoder";
import { createCanvas } from 'canvas';
import crypto from "crypto";

async function saveRoundReplay(data) {
    console.time("RoundReplayTime");
    getRoundReplayAsGif(data);
    console.timeEnd("RoundReplayTime");
    Logging.logInfo("[RoundReplays] Round replay saved.");
}


async function getRoundReplayAsGif(data) {
    const snapshots = parseRoundReplay(data);


    const canvas = createCanvas(200, 200)
    const ctx = canvas.getContext('2d')


    const encoder = new GifEncoder(canvas.width, canvas.height);  // Set gif dimensions
    encoder.createReadStream().pipe(fs.createWriteStream("var/lastRoundReplay.gif"));
    encoder.start();
    encoder.setDelay(100);  // Delay between frames (in ms)
    encoder.setRepeat(0);  // Loop the GIF
    encoder.setQuality(10)

    snapshots.forEach(snapshot => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);  // Clear canvas for each frame

        snapshot.forEach(point => {
            ctx.fillStyle = "red"
            ctx.fillRect((point.x * 1), (point.y * 1), 2, 2);  // Draw a small red square at each point
        });

        encoder.addFrame(ctx);
    });

    encoder.finish();
}

function parseRoundReplay(data) {
    const snapshots = [];
    let snapshot = [];

    data.split('\n').forEach(line => {
        if (line.startsWith("## START SNAPSHOT ##")) {
            snapshot = [];
        } else if (line.startsWith("## END SNAPSHOT ##")) {
            if (snapshot.length) snapshots.push(snapshot);
        } else {
            const match = line.match(/(\d+)@[^:]+: \((-?\d+\.\d+), (-?\d+\.\d+), (-?\d+\.\d+)\)/);
            if (match) {
                if (parseFloat(match[2]) == 0 && parseFloat(match[4]) == 0) {
                    return;
                }
                snapshot.push({
                    id: match[1],
                    x: parseFloat(match[2]),
                    z: parseFloat(match[3]),
                    y: parseFloat(match[4]),
                });
            }
        }
    });

    return snapshots;
};

function stringToRGB(str) {
    const hash = crypto.createHash("md5").update(str).digest("hex");
    const r = parseInt(hash.substring(0, 2), 16);
    const g = parseInt(hash.substring(2, 4), 16);
    const b = parseInt(hash.substring(4, 6), 16);
    return `rgb(${r},${g},${b})`;
}


export default { saveRoundReplay, getRoundReplayAsGif };
