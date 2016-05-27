/// <reference path="riot-ts.d.ts" />

import MapDiscoverer from "./MapDiscoverer";
import ReconnectingWebSocket from "./ReconnectingWebSocket";

const WEBSOCKET_URL = location.protocol.replace("http", "ws") +
            location.host + "/narrator/ws";

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
    private scenarioId: number;
    private scenes;

    constructor() {
        super();

        this.scenarioId = this.opts.scenarioId;
        this.scenes = this.opts.scenes;
    }

    onAddImageClickHandler(sceneId) {
        return e => {
            console.log("Adding file for scene", sceneId);
        };
    }

    onSceneCreate(_sceneId: number, newSceneTitle: string) {
        console.log("Current scenario is", this.scenarioId);
        console.log("Create new scene with title", newSceneTitle);
    }

    onSceneUpdate(sceneId: number, newSceneTitle: string) {
        console.log("Current scenario is", this.scenarioId);
        console.log("Update for scene", sceneId, ", new title is", newSceneTitle);
    }
}
