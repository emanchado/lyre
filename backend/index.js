import * as endpoints from "./endpoints";
import * as middlewares from "./middlewares";
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import expressSession from "express-session";
import expressLayout from "express-layout";
import http from "http";
import {Server as WebSocketServer} from "ws";

const app = express(),
      httpServer = http.Server(app),
      wsServer = WebSocketServer({server: httpServer});

// Application configuration
var configuration = {
    secretPassphrase: process.env.npm_package_config__passphrase,
    storeDirectory:   process.env.npm_package_config_store_directory,
    sessionSecret:   process.env.npm_package_config_session_secret
};

if (configuration.secretPassphrase === undefined) {
    throw new Error("Misconfigured app, no secret passphrase");
}
if (configuration.storeDirectory === undefined) {
    throw new Error("Misconfigured app, no store directory");
}

const authMiddleware = middlewares.getAuthMiddleware(configuration);

// General Express configuration
app.set("views", __dirname + "/../views");
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(expressSession({
    resave: false,
    saveUninitialized: false,
    secret: configuration.sessionSecret || "we have the BEST secrets"
}));
app.use(express.static(__dirname + "/../public"));
app.use(expressLayout());

app.all("/", authMiddleware, endpoints.index);
app.all("/scenarios/manage/:id", authMiddleware, endpoints.scenarioManage);
app.all("/scenarios/narrate/:id", authMiddleware, endpoints.scenarioNarrate);
// Listen does NOT have authentication!
app.all("/scenarios/listen/:id", endpoints.scenarioListen);

wsServer.on("connection", endpoints.wsConnection);

httpServer.listen(3000, function() {
    console.log("Listening on http://localhost:3000");
});
