import path from "path";

import config from "config";
import Q from "q";
import formidable from "formidable";

import StoryStore, { BadParameterException } from "./lib/StoryStore";

const store = new StoryStore(config.storyStore.dbPath,
                             config.storyStore.path);
// This returns a promise, but there's no good way to wait for it here
store.connect();

function index(req, res) {
    store.listStories().then(function(storyList) {
        res.render("index", {
            storyList: storyList
        });
    }).catch(function(err) {
        res.statusCode = 500;
        res.render("error", {
            errorMessage: "There was an error: " + err
        });
    });
}

function storyNew(req, res) {
    res.render("story-new");
}

function storyCreate(req, res) {
    const newStoryTitle = req.body["story-title"];

    store.addStory({title: newStoryTitle}).then(() => {
        res.redirect("/");
    }).catch(error => {
        res.statusCode = 400;
        res.render("error", {
            success: false,
            errorMessage: error.toString()
        });
    });
}

function storyConfirmDelete(req, res) {
    const storyId = req.params.id;

    store.getStory(storyId).then(story => {
        const numberScenes = story.scenes.length,
              numberFiles = story.scenes.
                  reduce((acc, scene) => acc + scene.files.length,
                         0),
              numberPlaylists = story.playlists.length,
              numberTracks = story.playlists.
                  reduce((acc, playlist) => acc + playlist.tracks.length,
                         0);

        res.render("story-confirm-delete", {
            id: story.id,
            title: story.title,
            numberScenes,
            numberFiles,
            numberPlaylists,
            numberTracks
        });
    }).catch(error => {
        res.statusCode = 500;
        res.render("error", {
            success: false,
            errorMessage: error.toString()
        });
    });
}

function storyDelete(req, res) {
    const storyId = req.params.id;

    store.deleteStory(storyId).then(() => {
        res.redirect("/");
    }).catch(error => {
        res.statusCode = 400;
        res.render("error", {
            success: false,
            errorMessage: error.toString()
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

function storyNarrateInstructions(req, res) {
    res.render("story-narrate-instructions", {id: req.params.id});
}

function storyNarrate(req, res) {
    const storyId = req.params.id;

    res.render("story-narrate", {
        id: storyId
    });
}

function storyListen(req, res) {
    res.render("story-listen", {layout: false, id: req.params.id});
}

function apiStories(req, res) {
    res.send(store.listStories());
}

function apiStory(req, res) {
    return store.getStory(req.params.id).then(story => {
        res.json(story);
    });
}

function apiPutStory(req, res) {
    const storyId = req.params.id,
          newStoryTitle = req.body.title;

    return store.updateStory(storyId, {title: newStoryTitle}).then(story => {
        res.json(story);
    }).catch(error => {
        res.statusCode = 400;
        res.json({success: false, errorMessage: error.toString()});
    });
}

function apiPutStoryFile(req, res) {
    const storyId = req.params.id,
          fileId = parseInt(req.params.fileId, 10),
          changeSpec = req.body;

    if ("previous" in changeSpec) {
        return store.reorderFile(
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
        ).then(({id, originalName, path, type}) => {
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
    const playlistId = parseInt(req.params.id, 10),
          changeSpec = req.body;

    if ("previous" in changeSpec) {
        return store.reorderPlaylist(
            playlistId,
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

    if (changeSpec.title) {
        return store.updatePlaylist(playlistId, changeSpec).then(playlist => {
            res.json(playlist);
        }).catch(error => {
            res.statusCode = 400;
            res.json({success: false, errorMessage: error.toString()});
        });
    }

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

function apiPostPlaylistTrack(req, res) {
    const playlistId = req.params.id;

    const form = new formidable.IncomingForm();
    form.uploadDir = config.tmpPath;

    Q.ninvoke(form, "parse", req).spread(function(fields, files) {
        var uploadedFileInfo = files.file,
            filename = path.basename(uploadedFileInfo.name),
            tmpPath = uploadedFileInfo.path;

        return store.addTrack(
            playlistId,
            {filename: filename, path: tmpPath}
        ).then(({id, originalName, path}) => {
            return store.storyIdForPlaylist(playlistId).then(storyId => {
                res.json({
                    id: id,
                    title: originalName,
                    url: "/stories/" + storyId + "/audio/" + encodeURI(path)
                });
            });
        });
    }).catch(error => {
        res.statusCode = 400;
        res.json({success: false, errorMessage: error.toString()});
    });
}

function apiPutStoryTrack(req, res) {
    const storyId = req.params.id,
          trackId = parseInt(req.params.trackId, 10),
          changeSpec = req.body;

    if ("previous" in changeSpec) {
        return store.reorderTrack(
            storyId,
            trackId,
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

    res.statusCode = 400;
    res.json({
        success: false,
        errorMessage: "Unsupported operation: " + JSON.stringify(req.body)
    });
}

function apiDeleteTrack(req, res) {
    const trackId = req.params.id;

    return store.deleteTrack(trackId).then(() => {
        res.statusCode = 204;
        res.end();
    }).catch(error => {
        res.statusCode = 400;
        res.json({success: false, errorMessage: error.toString()});
    });
}

function apiGetMarkers(req, res) {
    return store.getMarkers().then(markers => {
        res.json({markers: markers});
    }).catch(error => {
        res.statusCode = 500;
        res.json({success: false, errorMessage: error.toString()});
    });
}

function apiPostMarkers(req, res) {
    const form = new formidable.IncomingForm();
    form.uploadDir = config.tmpPath;

    Q.ninvoke(form, "parse", req).spread(function(fields, files) {
        var uploadedFileInfo = files.file,
            filename = path.basename(uploadedFileInfo.name),
            tmpPath = uploadedFileInfo.path;

        return store.addMarker(filename, tmpPath).then(({id, title, url}) => {
            res.json({
                id: id,
                title: title,
                url: url
            });
        });
    }).catch(error => {
        res.statusCode = 400;
        res.json({success: false, errorMessage: error.toString()});
    });
}

function apiPostStoryMarker(req, res) {
    const storyId = req.params.id,
          markerId = req.params.markerId;

    return store.addStoryMarker(storyId, markerId).then(() => {
        res.json({success: true});
    }).catch(error => {
        res.statusCode = 500;
        res.json({success: false, errorMessage: error.toString()});
    });
}

function apiDeleteStoryMarker(req, res) {
    const storyId = req.params.id,
          markerId = req.params.markerId;

    return store.deleteStoryMarker(storyId, markerId).then(() => {
        res.statusCode = 204;
        res.end();
    }).catch(error => {
        res.statusCode = 500;
        res.json({success: false, errorMessage: error.toString()});
    });
}

function apiPostStoryAllMarkers(req, res) {
    const storyId = req.params.id;

    return store.getMarkers().then(markers => (
        Q.all(
            markers.map(m => store.addStoryMarker(storyId, m.id))
        )
    )).then(() => {
        res.json({success: true});
    }).catch(error => {
        res.statusCode = 500;
        res.json({success: false, errorMessage: error.toString()});
    });
}

export { index, storyNew, storyCreate, storyConfirmDelete,
         storyDelete, storyManage, storyNarrateInstructions,
         storyNarrate, storyListen,

         apiStories, apiStory, apiPutStory, apiPutStoryFile, apiPutScene,
         apiPostStoryScene, apiPostSceneFile, apiDeleteStoryFile,
         apiDeleteScene, apiPutPlaylist, apiPostPlaylist,
         apiDeletePlaylist, apiPostPlaylistTrack, apiPutStoryTrack,
         apiDeleteTrack,

         apiGetMarkers, apiPostMarkers, apiPostStoryMarker,
         apiDeleteStoryMarker, apiPostStoryAllMarkers };
