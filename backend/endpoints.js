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
    res.render("scenario-narrate", {
        id: 1
    });
}

function scenarioListen(req, res) {
    res.render("scenario-listen", {layout: false});
}

function apiScenario(req, res) {
    res.send({
        files: [
            {title: "Robert Greene",
             url: "/catalog/Robert%20Greene.png",
             type: "image"},
            {title: "Robert Greene photograph",
             url: "/catalog/Robert%20Greene%20photograph.jpg",
             type: "image"},
            {title: "Caves",
             url: "/catalog/kubickas-roots-grid-small.jpg",
             type: "map"},
            {title: "Divide",
             url: "/catalog/kemps-divide-grid-small.jpg",
             type: "map"},
            {title: "Circles of Madness",
             url: "/catalog/froehlichs-circles-of-madness-grid-small.jpg",
             type: "map"}
        ],

        playlists: [
            {title: "Intro",
             tracks: [
                 {url: "/catalog/audio/Jessica%20Curry%20-%20Dear%20Esther%20-%2008%20Standing%20Stones.mp3",
                  title: "Standing Stones"}
             ]},
            {title: "Action",
             tracks: [
                 {url: "/catalog/audio/suitor-attacks-preview.mp3",
                  title: "Suitor Attacks"},
                 {url: "/catalog/audio/Cthulhus_Rising.mp3",
                  title: "Cthulhu's Rising"}
             ]},
            {title: "Ritual",
             tracks: [
                 {url: "/catalog/audio/Raise_Dead_Ritual.mp3",
                  title: "Raise Dead Ritual"}
             ]}
        ]
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
