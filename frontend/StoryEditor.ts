/// <reference path="riot-ts.d.ts" />

interface SelectedItem {
    id: number,
    _type: string
}

function readProp(obj, propName) {
    return obj[propName];
}

@template("/templates/story-editor.html")
export default class StoryEditor extends Riot.Element
{
    private storyId: number;
    private scenes: Array<any>;
    private playlists: Array<any>;
    private selectedItem: SelectedItem;
    private zoomedPlaylist;

    constructor() {
        super();

        this.storyId = this.opts.storyid;
        this.scenes = this.opts.scenes;
        this.playlists = this.opts.playlists;

        this.selectedItem = { id: null, _type: null };
        this.zoomedPlaylist = null;

        // Bind event handler methods so that they can be safely
        // passed around
        this.onSceneCreateClick = this.onSceneCreateClick.bind(this);
        this.onSceneCreate = this.onSceneCreate.bind(this);
        this.onSceneTitleUpdate = this.onSceneTitleUpdate.bind(this);
        this.onSceneDelete = this.onSceneDelete.bind(this);
        this.onFileSelect = this.onFileSelect.bind(this);
        this.onFileMoved = this.onFileMoved.bind(this);
        this.onFileUpload = this.onFileUpload.bind(this);
        // Playlist-related
        this.onPlaylistSelect = this.onPlaylistSelect.bind(this);
        this.onPlaylistCreateClick = this.onPlaylistCreateClick.bind(this);
        this.onPlaylistCreate = this.onPlaylistCreate.bind(this);
        this.onPlaylistTitleUpdate = this.onPlaylistTitleUpdate.bind(this);
        this.onTracksPlaylistClick = this.onTracksPlaylistClick.bind(this);
        this.onTrackUpload = this.onTrackUpload.bind(this);
        this.unzoomPlaylist = this.unzoomPlaylist.bind(this);
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
        xhr.open("POST", "/api/stories/" + this.opts.storyid + "/scenes");
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.addEventListener("load", function() {
            const newScene = JSON.parse(this.responseText);
            self.scenes.push(newScene);
            self.update();
        });
        xhr.send(JSON.stringify({"title": newSceneTitle}));
    }

    onSceneTitleUpdate(sceneId: number, newSceneTitle: string) {
        let xhr = new XMLHttpRequest();
        xhr.open("PUT", "/api/scenes/" + sceneId);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.addEventListener("load", () => {
            this.scenes.forEach(scene => {
                if (scene.id === sceneId) {
                    scene.title = newSceneTitle;
                    this.update();
                }
            });
        });
        xhr.send(JSON.stringify({"title": newSceneTitle}));
    }

    onSceneDelete(sceneId) {
        const xhr = new XMLHttpRequest();
        xhr.open("DELETE", "/api/scenes/" + sceneId);
        xhr.addEventListener("load", () => {
            let sceneIndex = null;

            this.scenes.forEach((scene, i) => {
                if (scene.id === sceneId) {
                    sceneIndex = i;
                }
            });

            this.scenes.splice(sceneIndex, 1);
            this.update();
        });
        xhr.send();
    }

    onFileSelect(fileId: number) {
        const { id, _type } = this.selectedItem;

        if (id === fileId && _type === "file") {
            this.selectedItem = { id: null, _type: null };
        } else {
            this.selectedItem = { id: fileId, _type: "file" };
        }

        this.update();
    }

    onFileMoved(fileId, newPreviousId) {
        let xhr = new XMLHttpRequest();
        xhr.open("PUT", "/api/stories/" + this.storyId + "/files/" + fileId);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify({"previous": newPreviousId}));
    }

    onFileUpload(sceneId: number, fileData) {
        const xhr = new XMLHttpRequest(),
        formData = new FormData(),
        self = this;

        xhr.open("POST", "/api/scenes/" + sceneId + "/files");
        xhr.addEventListener("load", function() {
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

    onDeleteFileClick(e) {
        if (!this.selectedItem.id) {
            return;
        }

        if (!confirm("Delete selected file?")) {
            return;
        }

        const xhr = new XMLHttpRequest(),
              deleteUrl = "/api/stories/" + this.opts.storyid +
                              "/files/" + this.selectedItem.id;

        xhr.open("DELETE", deleteUrl);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.addEventListener("load", () => {
            this.scenes.forEach(scene => {
                scene.files = scene.files.filter(file => {
                    return file.id !== this.selectedItem.id;
                });
            });
            this.selectedItem.id = null;
            this.update();
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
            "/api/stories/" + this.opts.storyid + "/files/" + this.selectedItem.id
        );
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.addEventListener("load", () => {
            selectedFileObject.type = newType;
            this.update();
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
        const { id, _type } = this.selectedItem;

        if (id === playlistId && _type === "playlist") {
            this.selectedItem = { id: null, _type: null };
        } else {
            this.selectedItem = { id: playlistId, _type: "playlist" };
        }

        this.update();
    }

    onPlaylistCreate(newTitle: string) {
        const self = this;

        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/stories/" + this.storyId + "/playlists");
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.addEventListener("load", function() {
            const newPlaylist = JSON.parse(this.responseText);

            self.playlists.push(newPlaylist);
            self.update();
        });
        xhr.send(JSON.stringify({"title": newTitle}));
    }

    onPlaylistTitleUpdate(playlistId: number, newTitle: string) {
        let xhr = new XMLHttpRequest();
        xhr.open("PUT", "/api/playlists/" + playlistId);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.addEventListener("load", () => {
            this.playlists = this.playlists.filter(playlist => {
                return playlist.id !== playlistId;
            });
            this.selectedItem.id = null;
            this.update();
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
            if (this.status === 400) {
                alert("Cannot delete playlist. Does it have any " +
                          "associated tracks?");
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

    unzoomPlaylist() {
        this.zoomedPlaylist = null;
        this.update();
    }

    onTrackUpload(playlistId: number, fileData) {
        const xhr = new XMLHttpRequest(),
        formData = new FormData(),
        self = this;

        xhr.open("POST", "/api/playlists/" + playlistId + "/tracks");
        xhr.addEventListener("load", function() {
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
}
