import * as url from "url";
import path from "path";

import config from "config";
import Q from "q";
import ScenarioStore from "./lib/ScenarioStore";

const webSockets = {narrator: [], audience: []},
      webSocketTypeForUrl = {"/narrator/ws": "narrator",
                             "/audience/ws": "audience"},
      webSocketDispatcher = {
          narrator: function(message) {
              webSockets.audience.forEach(function(socket) {
                  if (socket.readyState === 1) {
                      socket.send(message);
                  }
              });
          },
          audience: function(/*message*/) {}
      };

const scenarioStoreDir = path.join(config.scenarioStore.path);
const store = new ScenarioStore(scenarioStoreDir);

function index(req, res) {
    res.render("index", {
        scenarioList: store.listScenarios()
    });
}

function scenarioManage(req, res) {
    const scenarioInfo = store.getScenario(req.params.id);

    res.render("scenario-manage", {
        id: scenarioInfo.id,
        title: scenarioInfo.name,
        scenes: scenarioInfo.scenes,
        playlists: scenarioInfo.playlists
    });
}

function scenarioNarrate(req, res) {
    res.render("scenario-narrate", {
        id: 1
    });
}

function scenarioListen(req, res) {
    res.render("scenario-listen", {layout: false});
}

function apiScenarios(req, res) {
    res.send(store.listScenarios());
}

function apiScenario(req, res) {
    res.sendFile(path.join(store.storePath, req.params.id, "info.json"));
}

function apiScenarioImage(req, res) {
    const scenarioId = req.params.id,
          scenario = store.getScenario(scenarioId),
          imageId = parseInt(req.params.imageId, 10),
          changeSpec = req.body;

    if (changeSpec.action === "move") {
        store.reorderImage(scenarioId,
                           imageId,
                           parseInt(changeSpec.previous, 10));
        res.send(JSON.stringify({success: true}));
    } else {
        res.statusCode = 400;
        res.send("Don't understand action '" + changeSpec.action + "'");
    }
}

function wsConnection(ws) {
    const location = url.parse(ws.upgradeReq.url, true),
          webSocketType = webSocketTypeForUrl[location.path];

    if (!(webSocketType in webSockets)) {
        ws.close();
        return;
    }
    ws.on("message", webSocketDispatcher[webSocketType]);
    webSockets[webSocketType].push(ws);
}

export { index, scenarioManage, scenarioNarrate, scenarioListen,
         apiScenarios, apiScenario, apiScenarioImage, wsConnection };
