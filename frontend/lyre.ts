/// <reference path="riot-ts.d.ts" />

export default function mountAll(storyId) {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener("load", function() {
        const storyData = JSON.parse(this.responseText);

        const markerXhr = new XMLHttpRequest();
        markerXhr.addEventListener("load", function() {
            const markerPool = JSON.parse(this.responseText).markers;

            riot.mount('audienceview-app', {storyid: storyData.id});
            riot.mount('playlist-app', {playlists: storyData.playlists});
            riot.mount('filelister-app', {storyid: storyData.id,
                                          scenes: storyData.scenes,
                                          storymarkers: storyData.markerIds,
                                          markerpool: markerPool});
            riot.mount('story-editor', {storyid: storyData.id,
                                        storytitle: storyData.title,
                                        scenes: storyData.scenes,
                                        playlists: storyData.playlists,
                                        storymarkers: storyData.markerIds,
                                        markerpool: markerPool});
        });
        markerXhr.open("GET", "/api/markers");
        markerXhr.send();
    });
    xhr.open("GET", "/api/stories/" + storyId);
    xhr.send();
};
