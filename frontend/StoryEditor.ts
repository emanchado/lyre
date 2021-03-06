/// <reference path="riot-ts.d.ts" />

interface SelectedItem {
    id: number,
    _type: string
}

type SelectionType = "scene" | "file" | "playlist" | "track" | "storyMarker" | "marker";

function readProp(obj, propName) {
    return obj[propName];
}

@template("/templates/story-editor.html")
export default class StoryEditor extends Riot.Element
{
    private storyId: number;
    private storyTitle: string;
    private scenes: Array<any>;
    private playlists: Array<any>;
    private selectedItem: SelectedItem;
    private zoomedPlaylist;
    private showMarkerDialog: boolean;
    private storyMarkers: Array<number>;
    private markerPool: Array<any>;

    constructor() {
        super();

        this.storyId = this.opts.storyid;
        this.storyTitle = this.opts.storytitle;
        this.scenes = this.opts.scenes;
        this.playlists = this.opts.playlists;
        this.storyMarkers = this.opts.storymarkers;
        this.markerPool = this.opts.markerpool;

        this.selectedItem = { id: null, _type: null };
        this.zoomedPlaylist = null;
        this.showMarkerDialog = false;

        // Bind event handler methods so that they can be safely
        // passed around
        this.onRenameStoryClick = this.onRenameStoryClick.bind(this);
        this.onStoryRename = this.onStoryRename.bind(this);
        // Scene-related
        this.onMarkersClick = this.onMarkersClick.bind(this);
        this.onSceneCreateClick = this.onSceneCreateClick.bind(this);
        this.onSceneCreate = this.onSceneCreate.bind(this);
        this.onSceneSelect = this.onSceneSelect.bind(this);
        this.onFileSelect = this.onFileSelect.bind(this);
        this.onFileMoved = this.onFileMoved.bind(this);
        this.onFileUpload = this.onFileUpload.bind(this);
        // Playlist-related
        this.onPlaylistSelect = this.onPlaylistSelect.bind(this);
        this.onPlaylistCreateClick = this.onPlaylistCreateClick.bind(this);
        this.onPlaylistCreate = this.onPlaylistCreate.bind(this);
        this.onTracksPlaylistClick = this.onTracksPlaylistClick.bind(this);
        this.onRenamePlaylistClick = this.onRenamePlaylistClick.bind(this);
        this.onTrackSelect = this.onTrackSelect.bind(this);
        this.onTrackUpload = this.onTrackUpload.bind(this);
        this.onPlaylistMoved = this.onPlaylistMoved.bind(this);
        this.unzoomPlaylist = this.unzoomPlaylist.bind(this);
        this.onTrackMoved = this.onTrackMoved.bind(this);
        // Marker-related
        this.onStoryMarkerSelect = this.onStoryMarkerSelect.bind(this);
        this.onMarkerSelect = this.onMarkerSelect.bind(this);
        this.onMarkerUpload = this.onMarkerUpload.bind(this);
        this.onUseAllMarkersClick = this.onUseAllMarkersClick.bind(this);
        this.onMarkersCloseClick = this.onMarkersCloseClick.bind(this);
    }

    onRenameStoryClick(e) {
        const newStoryTitle = prompt("New story title:", this.storyTitle);

        if (newStoryTitle) {
            this.onStoryRename(newStoryTitle);
        }
    }

    onStoryRename(newStoryTitle: string) {
        const self = this;

        let xhr = new XMLHttpRequest();
        xhr.open("PUT", "/api/stories/" + this.storyId);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.addEventListener("load", function() {
            if (this.status >= 400) {
                const response = JSON.parse(this.responseText);
                alert("Could not rename story: " + response.errorMessage);
                return;
            }

            self.storyTitle = newStoryTitle;
            self.update();
        });
        xhr.send(JSON.stringify({"title": newStoryTitle}));
    }

    onMarkersClick(e) {
        this.showMarkerDialog = true;
    }

    addStoryMarker(storyId, markerId) {
        const self = this;

        const xhr = new XMLHttpRequest();
        const url = "/api/stories/" + storyId + "/markers/" + markerId;
        xhr.open("POST", url);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.addEventListener("load", function() {
            if (this.status >= 400) {
                const response = JSON.parse(this.responseText);
                alert("Could not import markers: " + response.errorMessage);
                return;
            }

            self.storyMarkers.push(markerId);
            self.selectedItem.id = null;
            self.update();
        });
        xhr.send();
    }

    onUseMarkerClick(e) {
        this.addStoryMarker(this.storyId, this.selectedItem.id);
    }

    onDropMarkerClick(e) {
        const self = this;

        const xhr = new XMLHttpRequest();
        const markerId = this.selectedItem.id;
        const url = "/api/stories/" + this.storyId + "/markers/" + markerId;
        xhr.open("DELETE", url);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.addEventListener("load", function() {
            if (this.status >= 400) {
                const response = JSON.parse(this.responseText);
                alert("Could not import all markers: " + response.errorMessage);
                return;
            }

            self.storyMarkers = self.storyMarkers.filter(m => m !== markerId);
            self.selectedItem.id = null;
            self.update();
        });
        xhr.send();
    }

    onUseAllMarkersClick(e) {
        const self = this;

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/stories/" + this.storyId + "/markers/all");
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.addEventListener("load", function() {
            if (this.status >= 400) {
                const response = JSON.parse(this.responseText);
                alert("Could not import all markers: " + response.errorMessage);
                return;
            }

            self.storyMarkers = self.markerPool.map(m => m.id);
            self.update();
        });
        xhr.send();
    }

    onMarkersCloseClick(e) {
        this.showMarkerDialog = false;
    }

    onSceneCreateClick(e) {
        const newSceneTitle = prompt("Title for the new scene:");

        if (newSceneTitle) {
            this.onSceneCreate(newSceneTitle);
        }
    }

    onSceneCreate(newSceneTitle: string) {
        const self = this;

        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/stories/" + this.storyId + "/scenes");
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.addEventListener("load", function() {
            if (this.status >= 400) {
                const response = JSON.parse(this.responseText);
                alert("Could not create the scene: " + response.errorMessage);
                return;
            }

            const newScene = JSON.parse(this.responseText);
            self.scenes.push(newScene);
            self.update();
        });
        xhr.send(JSON.stringify({"title": newSceneTitle}));
    }

    onSceneSelect(sceneId: number) {
        this.select("scene", sceneId);
    }

    select(newType: SelectionType, newId: number) {
        const { id, _type } = this.selectedItem;

        if (_type === newType && id === newId) {
            this.selectedItem = { id: null, _type: null };
        } else {
            this.selectedItem = { id: newId, _type: newType };
        }

        this.update();
    }

    onFileSelect(fileId: number) {
        this.select("file", fileId);
    }

    onFileMoved(fileId, newPreviousId) {
        let xhr = new XMLHttpRequest();
        xhr.open("PUT", "/api/stories/" + this.storyId + "/files/" + fileId);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.addEventListener("load", function() {
            if (this.status >= 400) {
                const response = JSON.parse(this.responseText);
                alert("Could not move file: " + response.errorMessage);
            }
        });
        xhr.send(JSON.stringify({"previous": newPreviousId}));
    }

    onFileUpload(sceneId: number, fileData) {
        const xhr = new XMLHttpRequest(),
        formData = new FormData(),
        self = this;

        xhr.open("POST", "/api/scenes/" + sceneId + "/files");
        xhr.addEventListener("load", function() {
            if (this.status >= 400) {
                const response = JSON.parse(this.responseText);
                alert("Could not upload file: " + response.errorMessage);
                return;
            }

            self.scenes.forEach(scene => {
                if (scene.id === sceneId) {
                    scene.files.push(JSON.parse(this.responseText));
                    self.update();
                    return false;
                }
            });
        });

        formData.append("file", fileData);
        formData.append("type", "image");
        xhr.send(formData);
    }

    onDeleteSceneClick(e) {
        let scene, sceneIndex;
        this.scenes.forEach((s, i) => {
            if (s.id === this.selectedItem.id) {
                scene = s;
                sceneIndex = i;
            }
        });

        if (scene.files.length) {
            alert("Sorry, cannot delete scenes that have associated files");
            return;
        }

        if (!confirm("Delete selected scene?")) {
            return;
        }

        const xhr = new XMLHttpRequest();
        xhr.open("DELETE", "/api/scenes/" + scene.id);
        const self = this;
        xhr.addEventListener("load", function() {
            if (this.status >= 400) {
                const response = JSON.parse(this.responseText);
                alert("Could not delete scene: " + response.errorMessage);
                return;
            }

            self.scenes.splice(sceneIndex, 1);
            self.selectedItem.id = null;
            self.update();
        });
        xhr.send();
    }

    onRenameSceneClick(e) {
        let scene;

        this.scenes.forEach(pl => {
            if (pl.id === this.selectedItem.id) {
                scene = pl;
            }
        });

        const newTitle = prompt(
            "New title for scene '" + scene.title + "'",
            scene.title
        );

        if (newTitle !== null && newTitle.trim() !== "") {
            const oldTitle = scene.title;
            scene.title = newTitle.trim();

            let xhr = new XMLHttpRequest();
            xhr.open("PUT", "/api/scenes/" + scene.id);
            xhr.setRequestHeader("Content-Type", "application/json");
            const self = this;
            xhr.addEventListener("load", function() {
                if (this.status >= 400) {
                    const response = JSON.parse(this.responseText);
                    alert("Could not rename scene: " + response.errorMessage);
                    scene.title = oldTitle;
                    self.update();
                }
            });
            xhr.send(JSON.stringify({"title": scene.title}));
        }
    }

    onDeleteFileClick(e) {
        if (!this.selectedItem.id) {
            return;
        }

        if (!confirm("Delete selected file?")) {
            return;
        }

        const xhr = new XMLHttpRequest(),
              deleteUrl = "/api/stories/" + this.storyId +
                              "/files/" + this.selectedItem.id;

        xhr.open("DELETE", deleteUrl);
        xhr.setRequestHeader("Content-Type", "application/json");
        const self = this;
        xhr.addEventListener("load", function() {
            if (this.status >= 400) {
                const response = JSON.parse(this.responseText);
                alert("Could not delete file: " + response.errorMessage);
                return;
            }

            self.scenes.forEach(scene => {
                scene.files = scene.files.filter(file => {
                    return file.id !== self.selectedItem.id;
                });
            });
            self.selectedItem.id = null;
            self.update();
        });
        xhr.send();
    }

    onToggleFileTypeClick() {
        if (!this.selectedItem.id) {
            return;
        }

        let selectedFileObject;
        this.scenes.forEach(scene => {
            scene.files.forEach(file => {
                if (file.id === this.selectedItem.id) {
                    selectedFileObject = file;
                }
            });
        });

        let xhr = new XMLHttpRequest(),
            newType = selectedFileObject.type === "image" ? "map" : "image";
        xhr.open(
            "PUT",
            "/api/stories/" + this.storyId + "/files/" + this.selectedItem.id
        );
        xhr.setRequestHeader("Content-Type", "application/json");
        const self = this;
        xhr.addEventListener("load", function() {
            if (this.status >= 400) {
                const response = JSON.parse(this.responseText);
                alert("Could not change image type: " + response.errorMessage);
                return;
            }

            selectedFileObject.type = newType;
            self.update();
        });
        xhr.send(JSON.stringify({"type": newType}));
    }

    onPlaylistCreateClick(e) {
        const newPlaylistTitle = prompt("Title for the new playlist:");

        if (newPlaylistTitle) {
            this.onPlaylistCreate(newPlaylistTitle);
        }
    }

    onPlaylistSelect(playlistId: number) {
        this.select("playlist", playlistId);
    }

    onPlaylistCreate(newTitle: string) {
        const self = this;

        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/stories/" + this.storyId + "/playlists");
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.addEventListener("load", function() {
            if (this.status >= 400) {
                const response = JSON.parse(this.responseText);
                alert("Could not create playlist: " + response.errorMessage);
                return;
            }

            const newPlaylist = JSON.parse(this.responseText);
            self.playlists.push(newPlaylist);
            self.update();
        });
        xhr.send(JSON.stringify({"title": newTitle}));
    }

    onDeletePlaylistClick(e) {
        if (!this.selectedItem.id) {
            return;
        }

        if (!confirm("Delete selected playlist?")) {
            return;
        }

        const xhr = new XMLHttpRequest(),
              deleteUrl = "/api/playlists/" + this.selectedItem.id,
              self = this;

        xhr.open("DELETE", deleteUrl);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.addEventListener("load", function() {
            if (this.status >= 400) {
                const response = JSON.parse(this.responseText);
                alert("Could not delete playlist: " + response.errorMessage);
                return;
            }

            self.playlists = self.playlists.filter(playlist => {
                return playlist.id !== self.selectedItem.id;
            });
            self.selectedItem.id = null;
            self.update();
        });
        xhr.send();
    }

    onPlaylistMoved(playlistId, newPreviousId) {
        let xhr = new XMLHttpRequest();
        xhr.open("PUT", "/api/playlists/" + playlistId);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.addEventListener("load", function() {
            if (this.status >= 400) {
                const response = JSON.parse(this.responseText);
                alert("Could not move playlist: " + response.errorMessage);
            }
        });
        xhr.send(JSON.stringify({"previous": newPreviousId}));
    }

    isPlaylistZoomed() {
        return !!this.zoomedPlaylist;
    }

    onTracksPlaylistClick(e) {
        this.playlists.forEach(playlist => {
            if (playlist.id === this.selectedItem.id) {
                this.zoomedPlaylist = playlist;
            }
        })
        this.selectedItem.id = null;
    }

    onRenamePlaylistClick(e) {
        let playlist;

        this.playlists.forEach(pl => {
            if (pl.id === this.selectedItem.id) {
                playlist = pl;
            }
        });

        const newTitle = prompt(
            "New title for playlist '" + playlist.title + "'",
            playlist.title
        );

        if (newTitle !== null && newTitle.trim() !== "") {
            const oldTitle = playlist.title;
            playlist.title = newTitle.trim();

            let xhr = new XMLHttpRequest();
            xhr.open("PUT", "/api/playlists/" + playlist.id);
            xhr.setRequestHeader("Content-Type", "application/json");
            const self = this;
            xhr.addEventListener("load", function() {
                if (this.status >= 400) {
                    const response = JSON.parse(this.responseText);
                    alert("Could not rename playlist: " + response.errorMessage);
                    playlist.title = oldTitle;
                    self.update();
                }
            });
            xhr.send(JSON.stringify({"title": playlist.title}));
        }
    }

    onTrackSelect(trackId: number) {
        this.select("track", trackId);
    }

    unzoomPlaylist() {
        this.zoomedPlaylist = null;
        this.selectedItem.id = null;
        this.update();
    }

    onTrackUpload(playlistId: number, fileData) {
        const xhr = new XMLHttpRequest(),
        formData = new FormData(),
        self = this;

        xhr.open("POST", "/api/playlists/" + playlistId + "/tracks");
        xhr.addEventListener("load", function() {
            if (this.status >= 400) {
                const response = JSON.parse(this.responseText);
                alert("Could not upload track: " + response.errorMessage);
                return;
            }

            self.playlists.forEach(playlist => {
                if (playlist.id === playlistId) {
                    playlist.tracks.push(JSON.parse(this.responseText));
                    self.update();
                    return false;
                }
            });
        });

        formData.append("file", fileData);
        xhr.send(formData);
    }

    onTrackMoved(trackId, newPreviousId) {
        let xhr = new XMLHttpRequest();
        xhr.open("PUT", "/api/stories/" + this.storyId + "/tracks/" + trackId);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.addEventListener("load", function() {
            if (this.status >= 400) {
                const response = JSON.parse(this.responseText);
                alert("Could not move track: " + response.errorMessage);
            }
        });
        xhr.send(JSON.stringify({"previous": newPreviousId}));
    }

    onDeleteTrackClick(e) {
        if (!this.selectedItem.id) {
            return;
        }

        if (!confirm("Delete selected track?")) {
            return;
        }

        const xhr = new XMLHttpRequest(),
              deleteUrl = "/api/tracks/" + this.selectedItem.id,
              self = this;

        xhr.open("DELETE", deleteUrl);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.addEventListener("load", function() {
            if (this.status >= 400) {
                const response = JSON.parse(this.responseText);
                alert("Could not delete track: " + response.errorMessage);
                return;
            }

            self.playlists.forEach(playlist => {
                playlist.tracks = playlist.tracks.filter(track => {
                    return track.id !== self.selectedItem.id;
                });
            });
            self.selectedItem.id = null;
            self.update();
        });
        xhr.send();
    }

    onStoryMarkerSelect(markerId: number) {
        this.select("storyMarker", markerId);
    }

    onMarkerSelect(markerId: number) {
        this.select("marker", markerId);
    }

    onMarkerUpload(fileData) {
        const xhr = new XMLHttpRequest(),
        formData = new FormData(),
        self = this;

        xhr.open("POST", "/api/markers");
        xhr.addEventListener("load", function() {
            const response = JSON.parse(this.responseText);

            if (this.status >= 400) {
                alert("Could not upload marker: " + response.errorMessage);
                return;
            }

            self.markerPool.push(response);
            self.storyMarkers.push(response.id);
            // Implicit self.update() call in addStoryMarker
            self.addStoryMarker(self.storyId, response.id);
        });

        formData.append("file", fileData);
        formData.append("type", "image");
        xhr.send(formData);
    }
}
