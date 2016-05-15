import Q from "q";
import fs from "fs";
import path from "path";
import { escape } from "querystring";

import config from "config";

function readImages(scenarioId) {
    const imageDir = path.join(config.storeDirectory, scenarioId, "images"),
          manifestPath = path.join(config.storeDirectory, scenarioId, "images", ".order");

    return Q.nfcall(fs.readFile, manifestPath, "utf-8").then(function(imageListJson) {
        return JSON.parse(imageListJson).images;
    }).then(function(files) {
        return files.map(function(file) {
            return {title: file.replace(/\..*/, ""),
                    url: "/scenarios/" + scenarioId + "/images/" + escape(file),
                    thumbnailUrl: "/scenarios/" + scenarioId + "/images/thumbnails/" + escape(file),
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
            return Q.nfcall(
                fs.readFile,
                path.join(playlistDir, playlistName, ".order"),
                "utf-8"
            );
        })).then(function(playlistJsonList) {
            playlists.forEach(function(playlistName, i) {
                const playlistTracks = JSON.parse(playlistJsonList[i]).tracks;
                result.push({title: playlistName,
                             tracks: playlistTracks.map(function(trackName) {
                                 return {
                                     url: "/scenarios/" + scenarioId + "/playlists/" + playlistName + "/" + trackName
                                 };
                             })});
            });

            return result;
        });
    });
}

export default { readImages, readPlaylists };
