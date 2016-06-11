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
app.all("/stories/new", authMiddleware, endpoints.storyNew);
app.post("/stories/create", authMiddleware, endpoints.storyCreate);
app.all("/stories/edit/:id", authMiddleware, endpoints.storyEdit);
app.post("/stories/update/:id", authMiddleware, endpoints.storyUpdate);
app.all("/stories/confirm-delete/:id", authMiddleware, endpoints.storyConfirmDelete);
app.post("/stories/delete/:id", authMiddleware, endpoints.storyDelete);
app.all("/stories/manage/:id", authMiddleware, endpoints.storyManage);
app.all("/stories/narrate-instructions/:id", authMiddleware, endpoints.storyNarrateInstructions);
app.all("/stories/narrate/:id", authMiddleware, endpoints.storyNarrate);
// These endpoints do NOT have authentication!
app.get("/stories/listen/:id", endpoints.storyListen);

// API endpoints. No authentication for now, but need to have!
app.get("/api/stories", endpoints.apiStories);
app.get("/api/stories/:id", endpoints.apiStory);
app.post("/api/stories/:id/scenes", endpoints.apiPostStoryScene);
app.put("/api/scenes/:id", endpoints.apiPutScene);
app.post("/api/scenes/:id/files", endpoints.apiPostSceneFile);
app.put("/api/stories/:id/files/:fileId", endpoints.apiPutStoryFile);
app.delete("/api/stories/:id/files/:fileId", endpoints.apiDeleteStoryFile);
app.delete("/api/scenes/:id", endpoints.apiDeleteScene);
app.put("/api/playlists/:id", endpoints.apiPutPlaylist);
app.post("/api/stories/:id/playlists", endpoints.apiPostPlaylist);
app.delete("/api/playlists/:id", endpoints.apiDeletePlaylist);
app.post("/api/playlists/:id/tracks", endpoints.apiPostPlaylistTrack);
app.put("/api/stories/:id/tracks/:trackId", endpoints.apiPutStoryTrack);
app.delete("/api/tracks/:id", endpoints.apiDeleteTrack);

wsServer.on("connection", endpoints.wsConnection);

httpServer.listen(config.port, function() {
    console.log("Listening on http://localhost:" + config.port);
});
