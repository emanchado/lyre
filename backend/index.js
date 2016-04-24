import * as endpoints from "./endpoints";
import * as middlewares from "./middlewares";
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import expressSession from "express-session";
import expressLayout from "express-layout";

const app = express();

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
app.all("/scenarios/view/:id", authMiddleware, endpoints.scenarioView);
app.all("/scenarios/narrate/:id", authMiddleware, endpoints.scenarioNarrate);

app.listen(3000);
