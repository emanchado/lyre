/// <reference path="riot-ts.d.ts" />

export default function mountAll(scenarioId) {
    let xhr = new XMLHttpRequest();
    xhr.addEventListener("load", function() {
        let data = JSON.parse(this.responseText);

        riot.mount('audienceview-app');
        riot.mount('playlist-app', {playlists: data.playlists});
        riot.mount('filelister-app', {files: data.files});
    });
    xhr.open("GET", "/api/scenarios/" + scenarioId);
    xhr.send();
};
