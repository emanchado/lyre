import Q from "q";
import fs from "fs";
import path from "path";
import { escape } from "querystring";

import config from "config";

function readImages(scenarioId) {
    const imageDir = path.join(config.storeDirectory, scenarioId, "images");

    return Q.nfcall(fs.readdir, imageDir).then(function(entries) {
        return entries.filter(function(entry) {
            return entry[0] !== ".";
        });
    }).then(function(files) {
        return files.map(function(file) {
            return {title: file.replace(/\..*/, ""),
                    url: "/scenarios/" + scenarioId + "/images/" + escape(file),
                    type: file.indexOf("map") === -1 ? "image" : "map"};
        });
    });
}

function readPlaylists(scenarioId) {
    const playlistDir = path.join(config.storeDirectory, scenarioId, "playlists");

    return Q.nfcall(fs.readdir, playlistDir).then(function(entries) {
        return entries.filter(function(entry) {
            return entry[0] !== ".";
        });
    }).then(function(playlists) {
        let result = [];

        return Q.all(playlists.map(function(playlistName) {
            return Q.nfcall(fs.readdir, path.join(playlistDir, playlistName)).then(function(entries) {
                return entries.filter(function(entry) {
                    return entry[0] !== ".";
                });
            });
        })).then(function(playlistTracks) {
            playlists.forEach(function(playlistName, i) {
                result.push({title: playlistName,
                             tracks: playlistTracks[i].map(function(track) {
                                 return {
                                     url: "/scenarios/" + scenarioId + "/playlists/" + playlistName + "/" + track
                                 };
                             })});
            });

            return result;
        });
    });
}

export default { readImages, readPlaylists };
