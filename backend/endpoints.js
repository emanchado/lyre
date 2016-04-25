import * as url from "url";

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
    res.render("scenario-narrate", {});
}

function scenarioListen(req, res) {
    res.render("scenario-listen", {layout: false});
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

export { index, scenarioManage, scenarioNarrate, scenarioListen, wsConnection };
