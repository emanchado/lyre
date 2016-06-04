/// <reference path="riot-ts.d.ts" />

import MapDiscoverer from "./MapDiscoverer";
import ReconnectingWebSocket from "./ReconnectingWebSocket";

const ENTER_KEY = 13;
const ESC_KEY = 27;

@template("/templates/sceneheader-editor.html")
class SceneHeaderEditor extends Riot.Element {
    private editMode: boolean;
    private editfield: HTMLInputElement;
    private toolBoxHovered: boolean;

    constructor() {
        super();
        this.editMode = false;
        this.toolBoxHovered = false;
    }

    switchViewMode() {
        this.editMode = false;
        this.update();
    }

    switchEditMode() {
        this.editMode = true;
        // Make sure the input field is in the DOM before trying to focus
        this.update();
        this.editfield.focus();
    }

    onKeyDown(e) {
        const onTitleUpdate = this.opts.ontitleupdate;

        if (e.which === ENTER_KEY) {
            this.switchViewMode();
        } else if (e.which === ESC_KEY) {
            this.editfield.value = this.opts.scene.title;
            this.switchViewMode();
        }
        // Return true; otherwise, the event default is prevented
        return true;
    }

    onBlur(e) {
        if (this.opts.scene.title !== e.target.value) {
            this.opts.ontitleupdate(this.opts.scene.id, e.target.value);
        }
        this.switchViewMode();
    }

    onHoverToolbox(e) {
        this.toolBoxHovered = true;
        return true;
    }

    onMouseOutToolbox(e) {
        this.toolBoxHovered = false;
        return true;
    }
}

@template("/templates/filelist-editor.html")
export default class FileListerEditor extends Riot.Element
{
    private storyId: number;
    private scenes;
    private currentDraggedItem;
    private selectedFile: number;

    constructor() {
        super();

        this.storyId = this.opts.storyId;
        this.scenes = this.opts.scenes;
        this.selectedFile = null;
    }

    onFileClickHandler(fileId) {
        return () => {
            this.selectedFile =
                this.selectedFile === fileId ? null : fileId;
        };
    }

    onClickDeleteFile(e) {
        if (!this.selectedFile) {
            return;
        }

        if (!confirm("Delete selected file?")) {
            return;
        }

        const xhr = new XMLHttpRequest(),
              deleteUrl = "/api/stories/" + this.storyId +
                              "/files/" + this.selectedFile;

        xhr.open("DELETE", deleteUrl);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.addEventListener("load", () => {
            this.scenes.forEach(scene => {
                scene.files = scene.files.filter(file => {
                    return file.id !== this.selectedFile;
                });
            });
            this.selectedFile = null;
            this.update();
        });
        xhr.send();
    }

    onClickToggleType() {
        if (!this.selectedFile) {
            return;
        }

        let selectedFileObject;
        this.scenes.forEach(scene => {
            scene.files.forEach(file => {
                if (file.id === this.selectedFile) {
                    selectedFileObject = file;
                }
            });
        });

        let xhr = new XMLHttpRequest(),
            newType = selectedFileObject.type === "image" ? "map" : "image";
        xhr.open(
            "PUT",
            "/api/stories/" + this.storyId + "/files/" + this.selectedFile
        );
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.addEventListener("load", () => {
            selectedFileObject.type = newType;
            this.update();
        });
        xhr.send(JSON.stringify({"type": newType}));
    }

    onAddImageClickHandler(sceneId) {
        return e => {
            this["newfile-" + sceneId].click();
        };
    }

    onNewFileChange(sceneId) {
        return e => {
            // The user cancelled, let's not try to create an empty file
            if (!e.target.value) {
                return;
            }

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

            formData.append("file", e.target.files[0]);
            formData.append("type", "image");
            xhr.send(formData);
        };
    }

    onSceneCreate(_sceneId: number, newSceneTitle: string) {
        const self = this;

        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/stories/" + this.storyId + "/scenes");
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.addEventListener("load", function() {
            const newScene = JSON.parse(this.responseText);
            self.scenes.push(newScene);
            self.update();
        });
        xhr.send(JSON.stringify({"title": newSceneTitle}));
    }

    onSceneUpdate(sceneId: number, newSceneTitle: string) {
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

    onClickDeleteScene(sceneId) {
        return (e) => {
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
        };
    }

    /**
     * Sometimes we can get Text nodes if we simply get to
     * .previousSibling, hence this method to make sure we get the
     * previous image element.
     */
    private previousFileEl(fileEl) {
        const previousSibling = fileEl.previousSibling;

        if (!previousSibling) {
            return null;
        }
        if (!(previousSibling instanceof HTMLElement)) {
            return this.previousFileEl(previousSibling);
        }

        return previousSibling;
    }

    onDragStart(ev) {
        this.currentDraggedItem = ev.target.parentNode;
        this.currentDraggedItem.style.opacity = "0.3";
        return true;
    }

    onDragEnd(ev) {
        const currentImageId = this.currentDraggedItem.dataset.id,
              prevImage = this.previousFileEl(this.currentDraggedItem),
              prevImageId = (prevImage && prevImage.dataset) ? prevImage.dataset.id : null;

        this.currentDraggedItem.style.opacity = "";
        this.currentDraggedItem = null;

        let xhr = new XMLHttpRequest();
        xhr.open("PUT", "/api/stories/" + this.storyId + "/files/" + currentImageId);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify({"previous": prevImageId}));

        return true;
    }

    onDragEnter(ev) {
        const targetLi = ev.target.parentNode;

        if (targetLi !== this.currentDraggedItem) {
            if (this.currentDraggedItem) {
                const parent = this.currentDraggedItem.parentNode;
                parent.insertBefore(this.currentDraggedItem, targetLi);
            }
        }
        return true;
    }
}
