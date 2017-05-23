import util from "util";
import path from "path";
import fse from "fs-extra";
import sqlite3 from "sqlite3";
import Q from "q";

import { upgradeDb } from "./StoryStoreMigrations";
import thumbnailer from "./thumbnailer";

export function BadParameterException(message) {
    Error.captureStackTrace(this, this);
    this.message = message || "Bad Request";
}
util.inherits(BadParameterException, Error);

function fileRowToApi(storyId, file) {
    const fileBaseUrl = "/stories/" + storyId + "/files";

    return {id: file.id,
            title: file.original_name,
            url: fileBaseUrl + "/" + file.path,
            thumbnailUrl: fileBaseUrl + "/thumbnails/" + file.path,
            type: file.type};
}

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

        if (file.id) {
            const currentSceneFiles = scenes[scenes.length - 1].files;
            currentSceneFiles.push(fileRowToApi(storyId, file));
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
                id: track.track_id,
                title: track.track_name,
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

    addStory(storyProps) {
        const deferred = Q.defer();

        if (!storyProps.title) {
            deferred.reject(new BadParameterException(
                "Cannot create scene without a title"
            ));
            return deferred.promise;
        }

        this.db.run(
            "INSERT INTO stories (title) VALUES (?)",
            storyProps.title,
            function(err) {
                if (err) {
                    deferred.reject(err);
                    return;
                }

                deferred.resolve({
                    id: this.lastID,
                    title: storyProps.title
                });
            }
        );

        return deferred.promise;
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
                    "F.id, F.type, F.original_name, F.path " +
                    "FROM scenes S LEFT JOIN files F " +
                    "ON S.id = F.scene_id WHERE story_id = ? " +
                    "ORDER BY S.position, F.position",
                storyId
            ),
            Q.ninvoke(
                this.db,
                "all",
                "SELECT P.id AS playlist_id, P.title AS playlist_title, " +
                    "T.id AS track_id, T.path AS track_path, " +
                    "T.original_name AS track_name " +
                    "FROM playlists P LEFT JOIN tracks T " +
                    "ON p.id = T.playlist_id WHERE story_id = ? " +
                    "ORDER BY P.position, T.position",
                storyId
            ),
            Q.ninvoke(
                this.db,
                "all",
                "SELECT marker_id AS id FROM story_markers WHERE story_id = ?",
                storyId
            )
        ]).spread((basicInfo, scenes, playlists, markers) => {
            return {
                id: basicInfo.id,
                title: basicInfo.title,
                scenes: sceneFileInfo(basicInfo.id, scenes),
                playlists: playlistTrackInfo(basicInfo.id, playlists),
                markerIds: markers.map(m => m.id)
            };
        });
    }

    updateStory(storyId, newProps) {
        if (!newProps.title) {
            const deferred = Q.defer();
            deferred.reject(new BadParameterException(
                "Need a non-empty title to update a story"
            ));
            return deferred.promise;
        }

        return Q.ninvoke(
            this.db,
            "run",
            "UPDATE stories SET title = ? WHERE id = ?",
            [newProps.title, storyId]
        ).then(() => {
            return this.getStory(storyId);
        });
    }

    deleteStory(storyId) {
        return this.getStory(storyId).then(story => {
            const sceneDelPromises = story.scenes.map(scene => {
                return Q.all(scene.files.map(file => {
                    return this.deleteFile(storyId, file.id);
                })).then(() => {
                    return this.deleteScene(scene.id);
                });
            });
            const playlistDelPromises = story.playlists.map(playlist => {
                return Q.all(playlist.tracks.map(track => {
                    return this.deleteTrack(track.id);
                })).then(() => {
                    return this.deletePlaylist(playlist.id);
                });
            });

            return Q.all(sceneDelPromises, playlistDelPromises).then(() => {
                return Q.ninvoke(
                    this.db,
                    "run",
                    "DELETE FROM stories WHERE id = ?",
                    storyId
                );
            });
        });
    }

    addScene(storyId, sceneProps) {
        const deferred = Q.defer();

        if (!sceneProps.title) {
            deferred.reject(new BadParameterException(
                "Cannot create scene without a title"
            ));
            return deferred.promise;
        }

        this.db.run(
            "INSERT INTO scenes (story_id, title, position) " +
                "VALUES (?, ?, " +
                "(SELECT COUNT(*) + 1 FROM scenes WHERE story_id = ?))",
            [storyId, sceneProps.title, storyId],
            function() {
                deferred.resolve({
                    id: this.lastID,
                    title: sceneProps.title,
                    files: []
                });
            }
        );

        return deferred.promise;
    }

    updateScene(sceneId, newProps) {
        if (!newProps.title) {
            const deferred = Q.defer();
            deferred.reject(new BadParameterException(
                "Cannot update scene to an empty title"
            ));
            return deferred.promise;
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

    deleteScene(sceneId) {
        return Q.ninvoke(
            this.db,
            "all",
            "SELECT scenes.story_id, scenes.position, " +
                "COUNT(files.id) AS cnt " +
                "FROM scenes LEFT JOIN files " +
                "ON scenes.id = files.scene_id " +
                "WHERE scenes.id = ?",
            sceneId
        ).then(rows => {
            if (rows.length === 0) {
                throw new BadParameterException(
                    "Scene " + sceneId + " does not exist"
                );
            }

            if (rows[0].cnt > 0) {
                throw new BadParameterException(
                    "Scene " + sceneId + " has associated files"
                );
            }

            return Q.ninvoke(
                this.db,
                "run",
                "DELETE FROM scenes WHERE id = ?",
                sceneId
            ).then(() => {
                return Q.ninvoke(
                    this.db,
                    "run",
                    "UPDATE scenes SET position = position - 1 " +
                        "WHERE story_id = ? AND position > ?",
                    [rows[0].story_id, rows[0].position]
                );
            });
        });
    }

    reorderFile(storyId, fileId, newPreviousId) {
        let filePosition, newPreviousPosition;

        // Moving to itself, that's not possible
        if (fileId === newPreviousId) {
            const deferred = Q.defer();
            deferred.reject(new BadParameterException("Cannot move file after itself"));
            return deferred.promise;
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
                throw new BadParameterException(
                    "At least one of the files is not part of the story"
                );
            }

            // For now, don't support moving between scenes
            if (rows[0].scene_id !== rows[1].scene_id) {
                throw new BadParameterException(
                    "Cannot move a file between scenes"
                );
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

    ensureDirForMarkers() {
        const markerDir = path.join(this.storyDir, "markers");

        return Q.nfcall(fse.mkdirp, markerDir);
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
                return Q.nfcall(fse.move, fileProps.path, finalPath);
            }).then(() => {
                const deferred = Q.defer();

                this.db.run(
                    "INSERT INTO files (scene_id, original_name, path, type, " +
                        "position) VALUES (?, ?, ?, ?, " +
                        "(SELECT COUNT(*) + 1 FROM files WHERE scene_id = ?))",
                    [sceneId, fileProps.filename, finalFilename,
                     fileProps.type, sceneId],
                    function(err/*, result*/) {
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

    deleteFile(storyId, fileId) {
        return Q.ninvoke(
            this.db,
            "all",
            "SELECT path, files.position " +
                "FROM files JOIN scenes ON files.scene_id = scenes.id " +
                "WHERE files.id = ? AND scenes.story_id = ?",
            [fileId, storyId]
        ).then(rows => {
            if (!rows.length) {
                throw new BadParameterException(
                    "File does not exist in the appropriate story"
                );
            }

            return Q.ninvoke(
                this.db,
                "run",
                "DELETE FROM files WHERE id = ?",
                fileId
            ).then(() => {
                return Q.ninvoke(
                    this.db,
                    "run",
                    "UPDATE files SET position = position - 1 " +
                        "WHERE position > ?",
                    rows[0].position
                );
            }).then(() => {
                const basePath = path.join(this.storyDir, storyId, "files"),
                      filePath = path.join(basePath, rows[0].path),
                      thumbPath = path.join(basePath,
                                            "thumbnails",
                                            rows[0].path);

                return Q.nfcall(fse.unlink, filePath).then(() => {
                    return Q.nfcall(fse.unlink, thumbPath);
                });
            });
        });
    }

    updateFile(storyId, fileId, update) {
        if (!update.type) {
            return Q(false);
        }

        return Q.ninvoke(
            this.db,
            "run",
            "UPDATE files SET type = ? WHERE id = ?",
            [update.type, fileId]
        ).then(() => {
            return Q.ninvoke(
                this.db,
                "get",
                "SELECT id, position, original_name as originalName," +
                    " path, type FROM files WHERE id = ?",
                fileId
            );
        });
    }

    addPlaylist(storyId, props) {
        if (!props.title) {
            return Q(false);
        }

        const deferred = Q.defer();

        this.db.run(
            "INSERT INTO playlists (story_id, title, position) " +
                "VALUES (?, ?, " +
                "(SELECT COUNT(*) + 1 FROM playlists WHERE story_id = ?))",
            [storyId, props.title, storyId],
            function(err) {
                if (err) {
                    deferred.reject(err);
                    return;
                }

                deferred.resolve(this.lastID);
            }
        );

        return deferred.promise.then(newPlaylistId => {
            return Q.ninvoke(
                this.db,
                "get",
                "SELECT id, title, position FROM playlists WHERE id = ?",
                newPlaylistId
            ).then(playlistInfo => {
                playlistInfo.tracks = [];

                return playlistInfo;
            });
        });
    }

    updatePlaylist(playlistId, newProps) {
        if (!newProps.title) {
            const deferred = Q.defer();
            deferred.reject(new BadParameterException(
                "Cannot update a playlist without title"
            ));
            return deferred.promise;
        }

        return Q.ninvoke(
            this.db,
            "run",
            "UPDATE playlists SET title = ? WHERE id = ?",
            [newProps.title, playlistId]
        ).then(() => {
            return Q.ninvoke(
                this.db,
                "get",
                "SELECT id, title, position FROM playlists WHERE id = ?",
                playlistId
            );
        });
    }

    reorderPlaylist(playlistId, newPreviousId) {
        let playlistPosition, newPreviousPosition;

        // Moving to itself, that's not possible
        if (playlistId === newPreviousId) {
            const deferred = Q.defer();
            deferred.reject(new BadParameterException("Cannot move file after itself"));
            return deferred.promise;
        }

        // Moving to the beginning is a special case
        if (!newPreviousId) {
            return Q.ninvoke(
                this.db,
                "get",
                "SELECT story_id, position FROM playlists " +
                    "WHERE playlists.id = ?",
                playlistId
            ).then(row => {
                return Q.ninvoke(
                    this.db,
                    "run",
                    "UPDATE playlists SET position = position + 1" +
                        " WHERE story_id = ? AND position < ?",
                    [row.story_id, row.position]
                ).then(() => {
                    return Q.ninvoke(
                        this.db,
                        "run",
                        "UPDATE playlists SET position = 1" +
                            " WHERE story_id = ? AND id = ?",
                        [row.story_id, playlistId]
                    );
                });
            });
        }

        // General case
        return Q.ninvoke(
            this.db,
            "all",
            "SELECT playlists.id, playlists.position, story_id " +
                "FROM playlists WHERE playlists.id IN (?, ?)",
            [playlistId, newPreviousId]
        ).then(rows => {
            if (rows.length !== 2) {
                throw new BadParameterException(
                    "At least one of the playlists does not exist"
                );
            }

            // For now, don't support moving between stories
            if (rows[0].story_id !== rows[1].story_id) {
                throw new BadParameterException(
                    "Cannot move a playlist between stories"
                );
            }
            const storyId = rows[0].story_id;

            rows.forEach(row => {
                if (row.id === playlistId) {
                    playlistPosition = row.position;
                } else {
                    newPreviousPosition = row.position;
                }
            });

            // Moving right-to-left or left-to-right is slightly different
            if (playlistPosition > newPreviousPosition) {
                return Q.ninvoke(
                    this.db,
                    "run",
                    "UPDATE playlists SET position = position + 1 " +
                        "WHERE story_id = ? AND position > ? AND position < ?",
                    [storyId, newPreviousPosition, playlistPosition]
                ).then(() => {
                    return Q.ninvoke(
                        this.db,
                        "run",
                        "UPDATE playlists SET position = ? WHERE id = ?",
                        [newPreviousPosition + 1, playlistId]
                    );
                });
            } else {
                return Q.ninvoke(
                    this.db,
                    "run",
                    "UPDATE playlists SET position = position - 1 " +
                        "WHERE story_id = ? AND position > ? AND position <= ?",
                    [storyId, playlistPosition, newPreviousPosition]
                ).then(() => {
                    return Q.ninvoke(
                        this.db,
                        "run",
                        "UPDATE playlists SET position = ? WHERE id = ?",
                        [newPreviousPosition, playlistId]
                    );
                });
            }
        });
    }

    deletePlaylist(playlistId) {
        return Q.ninvoke(
            this.db,
            "all",
            "SELECT playlists.position, playlists.story_id, " +
                "COUNT(tracks.id) AS cnt " +
                "FROM playlists " +
                "LEFT JOIN tracks ON playlists.id = tracks.playlist_id " +
                "WHERE playlists.id = ?",
            playlistId
        ).then(rows => {
            if (!rows.length) {
                throw new BadParameterException(
                    "Playlist does not exist in the given story"
                );
            }

            if (rows[0].cnt > 0) {
                throw new BadParameterException(
                    "Playlist " + playlistId + " has associated tracks"
                );
            }

            return Q.ninvoke(
                this.db,
                "run",
                "DELETE FROM playlists WHERE id = ?",
                playlistId
            ).then(() => {
                return Q.ninvoke(
                    this.db,
                    "run",
                    "UPDATE playlists SET position = position - 1 " +
                        "WHERE position > ?",
                    rows[0].position
                );
            });
        });
    }

    storyIdForPlaylist(playlistId) {
        return Q.ninvoke(
            this.db,
            "get",
            "SELECT story_id FROM playlists WHERE id = ?",
            playlistId
        ).then(row => row.story_id);
    }

    addTrack(playlistId, fileProps) {
        const originalExtension = fileProps.filename.replace(/.*\./, ""),
              finalFilename = poorMansUuid() + "." + originalExtension;

        return this.storyIdForPlaylist(playlistId).then(storyId => {
            const finalPath = path.join(this.storyDir,
                                        storyId.toString(),
                                        "audio",
                                        finalFilename);

            return this.ensureDirsForStory(storyId).then(() => {
                return Q.nfcall(fse.move, fileProps.path, finalPath);
            }).then(() => {
                const deferred = Q.defer();

                this.db.run(
                    "INSERT INTO tracks (playlist_id, original_name, path, " +
                        "position) VALUES (?, ?, ?, " +
                        "(SELECT COUNT(*) + 1 FROM tracks " +
                        "WHERE playlist_id = ?))",
                    [playlistId, fileProps.filename, finalFilename,
                     playlistId],
                    function(err/*, result*/) {
                        if (err) {
                            deferred.reject(err);
                            return;
                        }

                        deferred.resolve(this.lastID);
                    }
                );

                return deferred.promise;
            }).then(function(lastId) {
                return {
                    id: lastId,
                    playlistId: playlistId,
                    originalName: fileProps.filename,
                    path: finalFilename
                };
            });
        });
    }

    reorderTrack(storyId, trackId, newPreviousId) {
        let trackPosition, newPreviousPosition;

        // Moving to itself, that's not possible
        if (trackId === newPreviousId) {
            const deferred = Q.defer();
            deferred.reject(new BadParameterException("Cannot move track after itself"));
            return deferred.promise;
        }

        // Moving to the beginning is a special case
        if (!newPreviousId) {
            return Q.ninvoke(
                this.db,
                "get",
                "SELECT playlist_id, tracks.position FROM tracks " +
                    "JOIN playlists ON tracks.playlist_id = playlists.id " +
                    "WHERE tracks.id = ? AND playlists.story_id = ?",
                [trackId, storyId]
            ).then(row => {
                return Q.ninvoke(
                    this.db,
                    "run",
                    "UPDATE tracks SET position = position + 1" +
                        " WHERE playlist_id = ? AND position < ?",
                    [row.playlist_id, row.position]
                ).then(() => {
                    return Q.ninvoke(
                        this.db,
                        "run",
                        "UPDATE tracks SET position = 1" +
                            " WHERE playlist_id = ? AND id = ?",
                        [row.playlist_id, trackId]
                    );
                });
            });
        }

        // General case
        return Q.ninvoke(
            this.db,
            "all",
            "SELECT tracks.id, tracks.position, playlist_id FROM tracks " +
                "JOIN playlists ON tracks.playlist_id = playlists.id " +
                "WHERE story_id = ? AND tracks.id IN (?, ?)",
            [storyId, trackId, newPreviousId]
        ).then(rows => {
            if (rows.length !== 2) {
                throw new BadParameterException(
                    "At least one of the tracks is not part of the story"
                );
            }

            // For now, don't support moving between playlists
            if (rows[0].playlist_id !== rows[1].playlist_id) {
                throw new BadParameterException(
                    "Cannot move a track between playlists"
                );
            }
            const playlistId = rows[0].playlist_id;

            rows.forEach(row => {
                if (row.id === trackId) {
                    trackPosition = row.position;
                } else {
                    newPreviousPosition = row.position;
                }
            });

            // Moving right-to-left or left-to-right is slightly different
            if (trackPosition > newPreviousPosition) {
                return Q.ninvoke(
                    this.db,
                    "run",
                    "UPDATE tracks SET position = position + 1 " +
                        "WHERE playlist_id = ? AND position > ? " +
                        "AND position < ?",
                    [playlistId, newPreviousPosition, trackPosition]
                ).then(() => {
                    return Q.ninvoke(
                        this.db,
                        "run",
                        "UPDATE tracks SET position = ? WHERE id = ?",
                        [newPreviousPosition + 1, trackId]
                    );
                });
            } else {
                return Q.ninvoke(
                    this.db,
                    "run",
                    "UPDATE tracks SET position = position - 1 " +
                        "WHERE playlist_id = ? AND position > ? " +
                        "AND position <= ?",
                    [playlistId, trackPosition, newPreviousPosition]
                ).then(() => {
                    return Q.ninvoke(
                        this.db,
                        "run",
                        "UPDATE tracks SET position = ? WHERE id = ?",
                        [newPreviousPosition, trackId]
                    );
                });
            }
        });
    }

    deleteTrack(trackId) {
        return Q.ninvoke(
            this.db,
            "all",
            "SELECT path, tracks.position, playlists.story_id " +
                "FROM tracks JOIN playlists " +
                "ON tracks.playlist_id = playlists.id " +
                "WHERE tracks.id = ?",
            trackId
        ).then(rows => {
            if (!rows.length) {
                throw new BadParameterException("Track does not exist");
            }

            return Q.ninvoke(
                this.db,
                "run",
                "DELETE FROM tracks WHERE id = ?",
                trackId
            ).then(() => {
                return Q.ninvoke(
                    this.db,
                    "run",
                    "UPDATE tracks SET position = position - 1 " +
                        "WHERE position > ?",
                    rows[0].position
                );
            }).then(() => {
                const storyIdString = String(rows[0].story_id),
                      basePath = path.join(this.storyDir, storyIdString, "audio"),
                      filePath = path.join(basePath, rows[0].path);

                return Q.nfcall(fse.unlink, filePath);
            });
        });
    }

    getMarkers() {
        return Q.ninvoke(
            this.db,
            "all",
            "SELECT * FROM markers"
        );
    }

    addMarker(filename, tmpPath) {
        const originalExtension = filename.replace(/.*\./, ""),
              finalFilename = poorMansUuid() + "." + originalExtension,
              finalPath = path.join(this.storyDir, "markers", finalFilename);

        return this.ensureDirForMarkers().then(() => {
            return Q.nfcall(fse.move, tmpPath, finalPath);
        }).then(() => {
            const deferred = Q.defer();

            this.db.run(
                "INSERT INTO markers (title, url) VALUES (?, ?)",
                [filename, finalFilename],
                function(err/*, result*/) {
                    if (err) {
                        deferred.reject(err);
                        return;
                    }

                    deferred.resolve({
                        id: this.lastID,
                        title: filename,
                        url: finalFilename
                    });
                }
            );

            return deferred.promise;
        });
    }

    addStoryMarker(storyId, markerId) {
        return Q.ninvoke(
            this.db,
            "run",
            "INSERT OR REPLACE INTO story_markers (story_id, marker_id) " +
                "VALUES (?, ?)",
            [storyId, markerId]
        );
    }

    deleteStoryMarker(storyId, markerId) {
        return Q.ninvoke(
            this.db,
            "run",
            "DELETE FROM story_markers " +
                "WHERE story_id = ? AND marker_id = ?",
            [storyId, markerId]
        );
    }
}

export default StoryStore;
