import path from "path";
import fse from "fs-extra";
import sqlite3 from "sqlite3";
import Q from "q";

import { upgradeDb } from "./StoryStoreMigrations";
import thumbnailer from "./thumbnailer";

function sceneFileInfo(storyId, sceneFiles) {
    var scenes = [],
        seenScenes = {};

    sceneFiles.forEach(function(file) {
        if (!seenScenes[file.scene_id]) {
            scenes.push({id: file.scene_id,
                         title: file.scene_title,
                         files: []});
            seenScenes[file.scene_id] = true;
        }

        if (file.file_id) {
            const currentSceneFiles = scenes[scenes.length - 1].files,
                  fileBaseUrl = "/stories/" + storyId + "/files";
            currentSceneFiles.push({
                id: file.file_id,
                title: file.file_path,
                url: fileBaseUrl + "/" + file.file_path,
                thumbnailUrl: fileBaseUrl + "/thumbnails/" +
                    file.file_path,
                type: file.file_type
            });
        }
    });

    return scenes;
}

function playlistTrackInfo(storyId, playlistTracks) {
    var playlists = [],
        seenPlaylists = {};

    playlistTracks.forEach(function(track) {
        if (!seenPlaylists[track.playlist_id]) {
            playlists.push({id: track.playlist_id,
                            title: track.playlist_title,
                            tracks: []});
            seenPlaylists[track.playlist_id] = true;
        }

        if (track.track_path) {
            const currentPlaylistTracks =
                      playlists[playlists.length - 1].tracks;
            currentPlaylistTracks.push({
                url: "/stories/" + storyId + "/audio/" + track.track_path
            });
        }
    });

    return playlists;
}

function poorMansUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0,
            v = c === 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

class StoryStore {
    constructor(dbPath, storyDir) {
        this.dbPath = dbPath;
        this.storyDir = storyDir;
    }

    connect() {
        this.db = new sqlite3.Database(this.dbPath);
        return upgradeDb(this.db);
    }

    listStories() {
        return Q.ninvoke(
            this.db,
            "all",
            `SELECT stories.id, stories.title FROM stories`
        ).then(rows => {
            return rows.map(row => {
                return {
                    id: row.id,
                    title: row.title
                };
            });
        });
    }

    getStory(storyId) {
        return Q.all([
            Q.ninvoke(
                this.db,
                "get",
                "SELECT * FROM stories WHERE id = ?",
                storyId
            ),
            Q.ninvoke(
                this.db,
                "all",
                "SELECT S.id AS scene_id, S.title AS scene_title, " +
                    "F.id AS file_id, F.type AS file_type, " +
                    "F.path AS file_path " +
                    "FROM scenes S LEFT JOIN files F " +
                    "ON S.id = F.scene_id WHERE story_id = ? " +
                    "ORDER BY S.position, F.position",
                storyId
            ),
            Q.ninvoke(
                this.db,
                "all",
                "SELECT P.id AS playlist_id, P.title AS playlist_title, " +
                    "T.path AS track_path " +
                    "FROM playlists P LEFT JOIN tracks T " +
                    "ON p.id = T.playlist_id WHERE story_id = ? " +
                    "ORDER BY P.position, T.position",
                storyId
            )
        ]).spread((basicInfo, scenes, playlists) => {
            return {
                id: basicInfo.id,
                title: basicInfo.title,
                scenes: sceneFileInfo(basicInfo.id, scenes),
                playlists: playlistTrackInfo(basicInfo.id, playlists)
            };
        });
    }

    addScene(storyId, sceneProps) {
        if (!sceneProps.title) {
            throw new Error("Cannot create scene without a title");
        }

        const deferred = Q.defer();

        this.db.run(
            "INSERT INTO scenes (story_id, title, position) " +
                "VALUES (?, ?, " +
                "(SELECT COUNT(*) + 1 FROM scenes WHERE story_id = ?))",
            [storyId, sceneProps.title, storyId],
            function() {
                deferred.resolve({
                    id: this.lastID,
                    title: sceneProps.title
                });
            }
        );

        return deferred.promise;
    }

    updateScene(sceneId, newProps) {
        if (!newProps.title) {
            throw new Error("Cannot update scene to an empty title");
        }

        return Q.ninvoke(
            this.db,
            "run",
            "UPDATE scenes SET title = ? WHERE id = ?",
            [newProps.title, sceneId]
        ).then(() => {
            return {
                id: sceneId,
                title: newProps.title
            };
        });
    }

    reorderImage(storyId, fileId, newPreviousId) {
        let filePosition, newPreviousPosition;

        // Moving to itself, that's not possible
        if (fileId === newPreviousId) {
            return Q(false);
        }

        // Moving to the beginning is a special case
        if (!newPreviousId) {
            return Q.ninvoke(
                this.db,
                "get",
                "SELECT scene_id, files.position " +
                    "FROM files JOIN scenes ON files.scene_id = scenes.id " +
                    "WHERE files.id = ? AND scenes.story_id = ?",
                [fileId, storyId]
            ).then(row => {
                return Q.ninvoke(
                    this.db,
                    "run",
                    "UPDATE files SET position = position + 1" +
                        " WHERE scene_id = ? AND position < ?",
                    [row.scene_id, row.position]
                ).then(() => {
                    return Q.ninvoke(
                        this.db,
                        "run",
                        "UPDATE files SET position = 1" +
                            " WHERE scene_id = ? AND id = ?",
                        [row.scene_id, fileId]
                    );
                });
            });
        }

        // General case
        return Q.ninvoke(
            this.db,
            "all",
            "SELECT files.id, files.position, scene_id " +
                "FROM files JOIN scenes ON files.scene_id = scenes.id " +
                "WHERE story_id = ? AND files.id IN (?, ?)",
            [storyId, fileId, newPreviousId]
        ).then(rows => {
            if (rows.length !== 2) {
                return false;
            }

            // For now, don't support moving between scenes
            if (rows[0].scene_id !== rows[1].scene_id) {
                return false;
            }
            const sceneId = rows[0].scene_id;

            rows.forEach(row => {
                if (row.id === fileId) {
                    filePosition = row.position;
                } else {
                    newPreviousPosition = row.position;
                }
            });

            // Moving right-to-left or left-to-right is slightly different
            if (filePosition > newPreviousPosition) {
                return Q.ninvoke(
                    this.db,
                    "run",
                    "UPDATE files SET position = position + 1 " +
                        "WHERE scene_id = ? AND position > ? AND position < ?",
                    [sceneId, newPreviousPosition, filePosition]
                ).then(() => {
                    return Q.ninvoke(
                        this.db,
                        "run",
                        "UPDATE files SET position = ? WHERE id = ?",
                        [newPreviousPosition + 1, fileId]
                    );
                });
            } else {
                return Q.ninvoke(
                    this.db,
                    "run",
                    "UPDATE files SET position = position - 1 " +
                        "WHERE scene_id = ? AND position > ? AND position <= ?",
                    [sceneId, filePosition, newPreviousPosition]
                ).then(() => {
                    return Q.ninvoke(
                        this.db,
                        "run",
                        "UPDATE files SET position = ? WHERE id = ?",
                        [newPreviousPosition, fileId]
                    );
                });
            }
        });
    }

    storyIdForScene(sceneId) {
        return Q.ninvoke(
            this.db,
            "get",
            "SELECT story_id FROM scenes WHERE id = ?",
            sceneId
        ).then(row => row.story_id);
    }

    ensureDirsForStory(storyId) {
        const baseDir = path.join(this.storyDir, storyId.toString()),
              filesDir = path.join(baseDir, "files"),
              thumbsDir = path.join(filesDir, "thumbnails"),
              audioDir = path.join(baseDir, "audio");

        return Q.nfcall(fse.mkdirp, filesDir).then(() => {
            return Q.nfcall(fse.mkdirp, thumbsDir);
        }).then(() => {
            return Q.nfcall(fse.mkdirp, audioDir);
        });
    }

    addFile(sceneId, fileProps) {
        const originalExtension = fileProps.filename.replace(/.*\./, ""),
              finalFilename = poorMansUuid() + "." + originalExtension;

        return this.storyIdForScene(sceneId).then(storyId => {
            const finalPath = path.join(this.storyDir,
                                        storyId.toString(),
                                        "files",
                                        finalFilename);

            return this.ensureDirsForStory(storyId).then(() => {
                console.log("Moving", fileProps.path, "to", finalPath);
                return Q.nfcall(fse.move, fileProps.path, finalPath);
            }).then(() => {
                const deferred = Q.defer();

                this.db.run(
                    "INSERT INTO files (scene_id, original_name, path, type, " +
                        "position) VALUES (?, ?, ?, ?, " +
                        "(SELECT COUNT(*) + 1 FROM files WHERE scene_id = ?))",
                    [sceneId, fileProps.filename, finalFilename,
                     fileProps.type, sceneId],
                    function(err, result) {
                        if (err) {
                            deferred.reject(err);
                            return;
                        }

                        deferred.resolve(this.lastID);
                    }
                );

                return deferred.promise;
            }).then(function(lastId) {
                return thumbnailer.makeThumbnail(finalPath).then(() => {
                    return {
                        id: lastId,
                        sceneId: sceneId,
                        originalName: fileProps.filename,
                        path: finalFilename,
                        type: fileProps.type
                    };
                });
            });
        });
    }
}

export default StoryStore;
