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
app.use(bodyParser.json());
app.use(cookieParser());
app.use(expressSession({
    resave: false,
    saveUninitialized: false,
    secret: config.sessionSecret || "we have the BEST secrets"
}));
app.use(express.static(__dirname + "/../public"));
app.use("/stories", express.static(config.storyStore.path));
app.use(expressLayout());

app.all("/", authMiddleware, endpoints.index);
app.all("/stories/manage/:id", authMiddleware, endpoints.storyManage);
app.all("/stories/narrate/:id", authMiddleware, endpoints.storyNarrate);
// These endpoints do NOT have authentication!
app.get("/stories/listen/:id", endpoints.storyListen);

// API endpoints. No authentication for now, but need to have!
app.get("/api/stories", endpoints.apiStories);
app.get("/api/stories/:id", endpoints.apiStory);
app.put("/api/stories/:id/files/:fileId", endpoints.apiPutStoryFile);
app.put("/api/scenes/:id", endpoints.apiPutScene);

wsServer.on("connection", endpoints.wsConnection);

httpServer.listen(config.port, function() {
    console.log("Listening on http://localhost:" + config.port);
});
