import * as url from "url";
import path from "path";

import config from "config";
import Q from "q";
import StoryStore from "./lib/StoryStore";

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

const store = new StoryStore(config.storyStore.dbPath,
                             config.storyStore.path);
// TODO: This returns a promise, but there's no good way to wait for
// it here
store.connect();

function index(req, res) {
    res.render("index", {
        storyList: store.listStories()
    });
}

function storyManage(req, res) {
    const storyInfo = store.getStory(req.params.id);

    res.render("story-manage", {
        id: storyInfo.id,
        title: storyInfo.name,
        scenes: storyInfo.scenes,
        playlists: storyInfo.playlists
    });
}

function storyNarrate(req, res) {
    res.render("story-narrate", {
        id: 1
    });
}

function storyListen(req, res) {
    res.render("story-listen", {layout: false});
}

function apiStories(req, res) {
    res.send(store.listStories());
}

function apiStory(req, res) {
    return store.getStory(req.params.id);
}

function apiStoryImage(req, res) {
    const storyId = req.params.id,
          story = store.getStory(storyId),
          imageId = parseInt(req.params.imageId, 10),
          changeSpec = req.body;

    if (changeSpec.action === "move") {
        store.reorderImage(storyId,
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

export { index, storyManage, storyNarrate, storyListen,
         apiStories, apiStory, apiStoryImage, wsConnection };
