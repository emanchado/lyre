import path from "path";
import fse from "fs-extra";
import sqlite3 from "sqlite3";
import { upgradeDb } from "./StoryStoreMigrations";
import Q from "q";

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
                title: file.file_filename,
                url: fileBaseUrl + "/" + file.file_filename,
                thumbnailUrl: fileBaseUrl + "/thumbnails/" +
                    file.file_filename,
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

        if (track.track_filename) {
            const currentPlaylistTracks =
                      playlists[playlists.length - 1].tracks;
            currentPlaylistTracks.push({
                url: "/stories/" + storyId + "/audio/" + track.track_filename
            });
        }
    });

    return playlists;
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
                    "F.filename AS file_filename " +
                    "FROM scenes S LEFT JOIN files F " +
                    "ON S.id = F.scene_id WHERE story_id = ? " +
                    "ORDER BY S.position, F.position",
                storyId
            ),
            Q.ninvoke(
                this.db,
                "all",
                "SELECT P.id AS playlist_id, P.title AS playlist_title, " +
                    "T.filename AS track_filename " +
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

    // saveStory(story) {
    //     const storyDir = path.join(this.storePath, story.id.toString());

    //     fse.mkdirs(storyDir);
    //     fse.writeFileSync(path.join(storyDir, "info.json"),
    //                       JSON.stringify(story));
    // }

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
}

export default StoryStore;
