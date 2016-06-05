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
    private selectedItem: SelectedItem = { id: null, _type: null };

    constructor() {
        super();

        this.storyId = this.opts.storyid;
        this.scenes = this.opts.scenes;

        // Bind event handler methods so that they can be safely
        // passed around
        this.onSceneCreate = this.onSceneCreate.bind(this);
        this.onSceneTitleUpdate = this.onSceneTitleUpdate.bind(this);
        this.onSceneDelete = this.onSceneDelete.bind(this);
        this.onFileSelect = this.onFileSelect.bind(this);
        this.onFileMoved = this.onFileMoved.bind(this);
        this.onFileUpload = this.onFileUpload.bind(this);
    }

    onSceneCreate(_sceneId: number, newSceneTitle: string) {
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
        if (!this.selectedItem) {
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

    onToggleTypeClick() {
        if (!this.selectedItem) {
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
}
