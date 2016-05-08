import * as url from "url";
import Q from "q";
import scenarioStore from "./lib/scenarioStore";

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

function index(req, res) {
    res.render("index", {
        scenarios: [
            {id: 1, title: "Suffragettes"}
        ]
    });
}

function scenarioManage(req, res) {
    res.render("scenario-manage", {
        id: 1,
        title: "Suffragettes",
        images: [],
        playlists: [],
        maps: []
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

function apiScenario(req, res) {
    return Q.all([
        scenarioStore.readImages(req.params.id),
        scenarioStore.readPlaylists(req.params.id)
    ]).spread(function(files, playlists) {
        res.send({
            files: files,
            playlists: playlists
        });
    }).catch(function(err) {
        res.send("Error! " + err);
    });
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
         apiScenario, wsConnection };
