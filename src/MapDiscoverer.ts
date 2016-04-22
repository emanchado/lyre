import PencilTool from "./tools/PencilTool";
import RectangleTool from "./tools/RectangleTool";
import ToggleButton from "./ToggleButton";
import Toolbox from "./Toolbox";

class DiscoverableMap {
    private containerEl;
    private overlayEl;
    private stateIndex: number;
    private undoActions: Array<ImageData>;

    constructor() {}

    init() {
        this.containerEl = document.createElement("div");

        const mapImageEl = document.createElement("img");
        mapImageEl.style.position = "relative";
        mapImageEl.style.top = "0";
        mapImageEl.style.left = "0";
        const overlayEl = document.createElement("canvas");
        overlayEl.style.position = "absolute";
        overlayEl.style.top = "0";
        overlayEl.style.left = "0";
        overlayEl.style.opacity = "0.7";
        overlayEl.style.cursor = "crosshair";

        this.containerEl.appendChild(mapImageEl);
        this.containerEl.appendChild(overlayEl);

        this.addImageLoadHandler(mapImageEl);
    }

    addImageLoadHandler(imgEl, fn) {
        imgEl.addEventListener("load", () => {
            this.overlayEl.height = imgEl.height;
            this.overlayEl.width = imgEl.width;
            let ctx = this.overlayEl.getContext("2d");
            ctx.fillRect(0, 0, this.overlayEl.width, this.overlayEl.height);

            this.stateIndex = 0;
            this.undoActions = [ctx.getImageData(0,
                                                 0,
                                                 this.overlayEl.width,
                                                 this.overlayEl.height)];
            imgEl.style.visibility = "";

            this.opacityToggle.disable();
            this.coverToggle.disable();

            fn(width, height);
            this.uiHintsEl.height = imgEl.height;
            this.uiHintsEl.width = imgEl.width;
            let uiHintsCtx = this.uiHintsEl.getContext("2d");
            uiHintsCtx.clearRect(0, 0, this.uiHintsEl.width, this.uiHintsEl.height);
        });
    }

    loadImage(imageUrl) {
        this.mapImg.style.visibility = "hidden";
        // Setting "src" will load the image, and the "load" event
        // will take care of the rest
        this.mapImg.src = imageUrl;
    }
}

export default class MapDiscoverer {
    private overlayEl: HTMLCanvasElement;
    private uiHintsEl: HTMLCanvasElement;
    private undoActions: Array<ImageData>;
    private stateIndex: number;
    private opacityToggle: ToggleButton;
    private coverToggle: ToggleButton;
    private toolbox;

    constructor(toolsDiv: HTMLElement, uiHintsOverlay: HTMLCanvasElement) {
        this.mapImg = mapImg;
        this.overlayEl = overlay;
        this.uiHintsEl = uiHintsOverlay;
        this.undoActions = [];
        this.stateIndex = -1;

        // Create buttons
        let undoButton = this.createUndoButton(),
            redoButton = this.createRedoButton();
        this.opacityToggle = this.createOpacityToggleButton();
        this.coverToggle = this.createCoverToggleButton();
        this.toolbox = new Toolbox([PencilTool, RectangleTool]);

        // Add buttons to the UI
        toolsDiv.appendChild(this.opacityToggle.domElement);
        toolsDiv.appendChild(this.coverToggle.domElement);
        toolsDiv.appendChild(undoButton);
        toolsDiv.appendChild(redoButton);
        this.toolbox.install(this.overlayEl, this.uiHintsEl, toolsDiv);

        this.addCanvasHandlers(this.overlayEl);

        this.loadImage("img/default-map.png");
    }

    createUndoButton() {
        let ctx = this.overlayEl.getContext("2d");

        return this.createButton("Undo", "img/undo.png", "z", () => {
            if (this.stateIndex > 0) {
                this.stateIndex--;
                ctx.putImageData(this.undoActions[this.stateIndex], 0, 0);
            }
        });
    }

    createRedoButton() {
        let ctx = this.overlayEl.getContext("2d");

        return this.createButton("Redo", "img/redo.png", "y", () => {
            if (this.stateIndex + 1 < this.undoActions.length) {
                this.stateIndex++;
                ctx.putImageData(this.undoActions[this.stateIndex], 0, 0);
            }
        });
    }

    createOpacityToggleButton() {
        return new ToggleButton(["Toggle opacity", "Toggle opacity"],
                                "img/transparency.png",
                                "o",
                                () => {
                                    this.overlayEl.style.opacity = "1";
                                },
                                () => {
                                    this.overlayEl.style.opacity = "";
                                });
    }

    createCoverToggleButton() {
        let ctx = this.overlayEl.getContext("2d");

        return new ToggleButton(
            ["Uncover Mode", "Cover Mode"],
            "img/eraser.png",
            "c",
            () => {
                ctx.globalCompositeOperation = "source-over";
            },
            () => {
                ctx.globalCompositeOperation = "destination-out";
            }
        );
    }

    createButton(title, iconUrl, accessKey, functionality) {
        let button = document.createElement("button"),
            buttonImg = document.createElement("img");
        buttonImg.src = iconUrl;
        button.appendChild(buttonImg);
        button.appendChild(document.createTextNode(" " + title));
        button.accessKey = accessKey;
        button.addEventListener("click", functionality);
        return button;
    }

    addCanvasHandlers(overlayEl) {
        let ctx = this.overlayEl.getContext("2d"),
            uiHintsCtx = this.uiHintsEl.getContext("2d");

        overlayEl.addEventListener("mousedown", evt => {
            this.toolbox.currentTool.onStart(evt);
        }, false);
        overlayEl.addEventListener("mouseup", evt => {
            this.toolbox.currentTool.onStop(evt);
            // Take a snapshot of the overlayEl for undo purposes
            this.stateIndex++;
            this.undoActions = this.undoActions.slice(0, this.stateIndex);
            this.undoActions[this.stateIndex] =
                ctx.getImageData(0, 0, overlayEl.width, overlayEl.height);
        }, false);
        overlayEl.addEventListener("mousemove", evt => {
            this.toolbox.currentTool.onMove(evt);
        }, false);
        overlayEl.addEventListener("mouseout", () => {
            uiHintsCtx.clearRect(0,
                                 0,
                                 this.uiHintsEl.width,
                                 this.uiHintsEl.height);
        });
    }

}
