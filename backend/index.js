import * as endpoints from "./endpoints";
import * as middlewares from "./middlewares";
import config from "config";
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import expressSession from "express-session";
import expressLayout from "express-layout";
import http from "http";
import {Server as WebSocketServer} from "ws";

let app = express(),
    httpServer = http.Server(app),
    wsServer = WebSocketServer({server: httpServer});

if (!config.secretPassphrase) {
    throw new Error("Misconfigured app, no secret passphrase");
}

const authMiddleware = middlewares.getAuthMiddleware(config);

// General Express configuration
app.set("views", __dirname + "/../views");
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(expressSession({
    resave: false,
    saveUninitialized: false,
    secret: config.sessionSecret || "we have the BEST secrets"
}));
app.use(express.static(__dirname + "/../public"));
app.use(expressLayout());

app.all("/", authMiddleware, endpoints.index);
app.all("/scenarios/manage/:id", authMiddleware, endpoints.scenarioManage);
app.all("/scenarios/narrate/:id", authMiddleware, endpoints.scenarioNarrate);
// These endpoints do NOT have authentication!
app.all("/scenarios/listen/:id", endpoints.scenarioListen);
app.get("/api/scenarios/:id", endpoints.apiScenario);

wsServer.on("connection", endpoints.wsConnection);

httpServer.listen(config.port, function() {
    console.log("Listening on http://localhost:" + config.port);
});
