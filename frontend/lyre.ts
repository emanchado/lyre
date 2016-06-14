/// <reference path="riot-ts.d.ts" />

export default function mountAll(storyId) {
    let xhr = new XMLHttpRequest();
    xhr.addEventListener("load", function() {
        let data = JSON.parse(this.responseText);

        riot.mount('audienceview-app');
        riot.mount('playlist-app', {playlists: data.playlists});
        riot.mount('filelister-app', {scenes: data.scenes});
        riot.mount('story-editor', {storyid: data.id,
                                    storytitle: data.title,
                                    scenes: data.scenes,
                                    playlists: data.playlists});
        // riot.mount('playlist-editor', {storyId: data.id,
        //                                playlists: data.playlists});
        // riot.mount('filelist-editor', {storyId: data.id,
        //                                scenes: data.scenes});
    });
    xhr.open("GET", "/api/stories/" + storyId);
    xhr.send();
};
