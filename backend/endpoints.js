import * as url from "url";
import path from "path";

import config from "config";
import Q from "q";
import formidable from "formidable";

import StoryStore, { BadParameterException } from "./lib/StoryStore";

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
    store.listStories().then(function(storyList) {
        res.render("index", {
            storyList: storyList
        });
    }).catch(function(err) {
        res.render("error", {
            errorMessage: "There was an error: " + err
        });
    });
}

function storyManage(req, res) {
    store.getStory(req.params.id).then(storyInfo => {
        res.render("story-manage", {
            id: storyInfo.id,
            title: storyInfo.title
        });
    }).catch(err => {
        res.render("error", {
            errorMessage: "Error = " + err
        });
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
    return store.getStory(req.params.id).then(story => {
        res.json(story);
    });
}

function apiPutStoryFile(req, res) {
    const storyId = req.params.id,
          fileId = parseInt(req.params.fileId, 10),
          changeSpec = req.body;

    if ("previous" in changeSpec) {
        return store.reorderImage(
            storyId,
            fileId,
            parseInt(changeSpec.previous, 10)
        ).then(result => {
            res.json(result);
        }).catch(error => {
            if (error instanceof BadParameterException) {
                res.statusCode = 400;
            } else {
                res.statusCode = 500;
            }
            res.json({success: false, errorMessage: error.toString()});
        });
    }

    if (changeSpec.type) {
        return store.updateFile(
            storyId,
            fileId,
            {type: changeSpec.type}
        ).then(file => {
            res.json(file);
        }).catch(error => {
            res.statusCode = 500;
            res.json({success: false, errorMessage: error.toString()});
        });
    }
}

function apiPutScene(req, res) {
    const sceneId = req.params.id,
          newProps = req.body;

    store.updateScene(sceneId, newProps).then(updatedScene => {
        res.send(updatedScene);
    }).catch(err => {
        res.statusCode = 400;
        res.json({error: err});
    });
}

function apiPostStoryScene(req, res) {
    const storyId = req.params.id,
          sceneTitle = req.body.title;

    store.addScene(storyId, {title: sceneTitle}).then(newScene => {
        res.json(newScene);
    }).catch(err => {
        res.statusCode = 400;
        res.json({error: err.toString()});
    });
}

function apiPostSceneFile(req, res) {
    const sceneId = req.params.id;

    const form = new formidable.IncomingForm();
    form.uploadDir = config.tmpPath;

    Q.ninvoke(form, "parse", req).spread(function(fields, files) {
        var uploadedFileInfo = files.file,
            filename = path.basename(uploadedFileInfo.name),
            tmpPath = uploadedFileInfo.path,
            type = fields.type || "image";

        return store.addFile(
            sceneId,
            {filename: filename, path: tmpPath, type: type}
        ).then(({id, sceneId, originalName, path, type}) => {
            return store.storyIdForScene(sceneId).then(storyId => {
                res.json({
                    id: id,
                    title: originalName,
                    type: type,
                    url: "/stories/" + storyId + "/files/" + encodeURI(path),
                    thumbnailUrl: "/stories/" + storyId + "/files/thumbnails/" + encodeURI(path)
                });
            });
        });
    }).catch(error => {
        res.statusCode = 400;
        res.json({success: false, errorMessage: error.toString()});
    });
}

function apiDeleteStoryFile(req, res) {
    const storyId = req.params.id,
          fileId = req.params.fileId;

    return store.deleteFile(storyId, fileId).then(() => {
        res.statusCode = 204;
        res.end();
    }).catch(error => {
        res.statusCode = 400;
        res.json({success: false, errorMessage: error.toString()});
    });
}

function apiDeleteScene(req, res) {
    const sceneId = req.params.id;

    return store.deleteScene(sceneId).then(() => {
        res.statusCode = 204;
        res.end();
    }).catch(error => {
        res.statusCode = 400;
        res.json({success: false, errorMessage: error.toString()});
    });
}

function apiPutPlaylist(req, res) {
    const playlistId = req.params.id,
          changes = req.body;

    return store.updatePlaylist(playlistId, changes).then(playlist => {
        res.json(playlist);
    }).catch(error => {
        res.statusCode = 400;
        res.json({success: false, errorMessage: error.toString()});
    });
}

function apiPostPlaylist(req, res) {
    const storyId = req.params.id,
          playlistProps = req.body;

    return store.addPlaylist(storyId, playlistProps).then(playlist => {
        res.json(playlist);
    }).catch(error => {
        res.statusCode = 400;
        res.json({success: false, errorMessage: error.toString()});
    });
}

function apiDeletePlaylist(req, res) {
    const playlistId = req.params.id;

    return store.deletePlaylist(playlistId).then(() => {
        res.statusCode = 204;
        res.end();
    }).catch(error => {
        res.statusCode = 400;
        res.json({success: false, errorMessage: error.toString()});
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

export { index, storyManage, storyNarrate, storyListen,
         apiStories, apiStory, apiPutStoryFile, apiPutScene,
         apiPostStoryScene, apiPostSceneFile, apiDeleteStoryFile,
         apiDeleteScene, apiPutPlaylist, apiPostPlaylist,
         apiDeletePlaylist, wsConnection };
