import Logging from "../Logging.js";
import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import cors from "cors";
import passport from "passport";
import { Strategy } from "passport-steam";
import { Profile } from "passport";
import session from "express-session";
import crypto from "crypto";

const BACKEND_URL = "https://dscbcnd.zeitvertreib.vip";

const app = express();
const server = createServer(app);

app.use(cors({ credentials: true }));

passport.serializeUser((user: Express.User, done) => {
    done(null, user);
});

passport.deserializeUser((obj: Express.User, done) => {
    done(null, obj);
});

app.use(
    session({
        secret: crypto.randomUUID(),
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, // set to true if behind HTTPS
    })
);

server.listen(3001, () => {
    Logging.logInfo("[STEAM AUTH] SteamAuthentication running on port 3001");
});

const prefixMap = new Map<string, string | null>();

function run(randomUUID: string): void {
    const prefix = `/${randomUUID}`;
    const router = express.Router();

    prefixMap.set(randomUUID, null);

    passport.use(
        randomUUID,
        new Strategy(
            {
                returnURL: `${BACKEND_URL}${prefix}/auth/steam/return`,
                realm: `${BACKEND_URL}${prefix}`,
                apiKey: process.env.STEAM_API_KEY!,
            },
            (identifier: string, profile: Profile, done) => {
                process.nextTick(() => {
                    (profile as any).identifier = identifier;
                    return done(null, profile);
                });
            }
        )
    );

    app.use(passport.initialize());
    app.use(passport.session());

    router.get("/auth/login", (req: Request, res: Response, next: NextFunction) => {
        passport.authenticate(randomUUID)(req, res, next);
    });

    router.get(
        "/auth/steam/return",
        passport.authenticate(randomUUID),
        (req: Request, res: Response) => {
            const user = req.user as Profile & { id: string; displayName: string };

            Logging.logInfo(`${prefix}/auth/steam/return: ${user.displayName} (${user.id})`);
            res.status(200).send("Hat alles geklappt! Jetzt geh zurück in das Ticket auf Discord ^^");

            prefixMap.set(randomUUID, user.id);

            // Remove routes with the specific prefix
            app._router.stack = app._router.stack.filter(
                (layer: any) =>
                    !(
                        layer?.route?.path?.startsWith(`${prefix}/auth`) ||
                        layer?.regexp?.toString().includes(prefix)
                    )
            );
        }
    );

    app.use(prefix, router);
}

export default { run, prefixMap };
