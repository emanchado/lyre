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
        scenarios: [
            {id: 1, title: "Suffragettes"}
        ],
        scenarioList: store.listScenarios()
    });
}

function scenarioManage(req, res) {
    const scenarioInfo = store.getScenario(req.params.id);

    res.render("scenario-manage", {
        id: scenarioInfo.id,
        title: scenarioInfo.name,
        files: scenarioInfo.files,
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
         apiScenarios, apiScenario, wsConnection };
