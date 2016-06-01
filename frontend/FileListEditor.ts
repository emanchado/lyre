/// <reference path="riot-ts.d.ts" />

import MapDiscoverer from "./MapDiscoverer";
import ReconnectingWebSocket from "./ReconnectingWebSocket";

@template("/templates/sceneheader-editor.html")
class SceneHeaderEditor extends Riot.Element {
    private editMode: boolean;

    constructor() {
        super();
        this.editMode = false;
    }

    switchEditMode() {
        this.editMode = true;
    }

    onKeyDown(e) {
        const onTitleUpdate = this.opts.ontitleupdate;

        if (e.which === 13) {
            onTitleUpdate(this.opts.scene.id, e.target.value);
            this.editMode = false;
        }
        // Return true; otherwise, the event default is prevented
        return true;
    }
}

@template("/templates/filelist-editor.html")
export default class FileListerEditor extends Riot.Element
{
    private storyId: number;
    private scenes;
    private currentDraggedItem;

    constructor() {
        super();

        this.storyId = this.opts.storyId;
        this.scenes = this.opts.scenes;
    }

    onAddImageClickHandler(sceneId) {
        return e => {
            console.log("Adding file for scene", sceneId);
        };
    }

    onSceneCreate(_sceneId: number, newSceneTitle: string) {
        console.log("Current scenario is", this.storyId);
        console.log("Create new scene with title", newSceneTitle);
    }

    onSceneUpdate(sceneId: number, newSceneTitle: string) {
        console.log("Current scenario is", this.storyId);
        console.log("Update for scene", sceneId, ", new title is", newSceneTitle);
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
        xhr.open("POST", "/api/stories/" + this.storyId + "/files/" + currentImageId);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify({"action": "move", "previous": prevImageId}));

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
