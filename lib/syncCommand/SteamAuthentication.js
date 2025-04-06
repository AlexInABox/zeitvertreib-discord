import Logging from "../Logging.js";
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import passport from 'passport';
import { Strategy as SteamStrategy } from 'passport-steam';
import session from 'express-session';
import crypto from 'crypto';

const BACKEND_URL = "https://dscbcnd.zeitvertreib.vip";


const app = express();
const server = createServer(app);

app.use(cors({
    credentials: true
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

app.use(session({
    secret: crypto.randomUUID(),
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Setze `true`, wenn HTTPS verwendet wird
}));

server.listen(3001, () => {
    Logging.logInfo("[STEAM AUTH] SteamAuthentication running on port 3001");
});

const prefixMap = new Map();

function run(randomUUID) {
    const prefix = `/${randomUUID}`;
    const router = express.Router();

    // Store initial value
    prefixMap.set(randomUUID, null);

    passport.use(randomUUID, new SteamStrategy({
        returnURL: `${BACKEND_URL}${prefix}/auth/steam/return`,
        realm: `${BACKEND_URL}${prefix}`,
        apiKey: process.env.STEAM_API_KEY,
    }, (identifier, profile, done) => {
        process.nextTick(() => {
            profile.identifier = identifier;
            return done(null, profile);
        });
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    router.get('/auth/login', (req, res, next) => {
        return passport.authenticate(randomUUID)(req, res, next);
    });

    router.get('/auth/steam/return',
        passport.authenticate(randomUUID),
        (req, res) => {
            Logging.logInfo(`${prefix}/auth/steam/return: ${req.user.displayName} (${req.user.id})`);
            res.status(200).send("Hat alles geklappt! Jetzt geh zurück in das Ticket auf Discord ^^");

            // Save user ID in the map
            prefixMap.set(randomUUID, req.user.id);

            // Remove routes
            app._router.stack = app._router.stack.filter(layer => {
                return !(layer?.route?.path?.startsWith(`${prefix}/auth`) || layer?.regexp?.toString().includes(prefix));
            });
        }
    );

    app.use(prefix, router);
}


export default { run, prefixMap };