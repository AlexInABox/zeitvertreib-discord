// playerServer.ts
import express from 'express';
import Logging from './Logging.js';
import { serverStats } from '../index.js';

const app = express();

app.get('/playerlist', (_req, res) => {
    res.json(serverStats.playerList);
});

app.listen(3002, () => {
    Logging.logInfo('[API SERVER] Server running on port 3002');
});

export default {}