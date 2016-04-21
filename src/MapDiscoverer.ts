import PencilTool from "./tools/PencilTool";
import RectangleTool from "./tools/RectangleTool";
import ToggleButton from "./ToggleButton";
import Toolbox from "./Toolbox";

export default class MapDiscoverer {
    private canvasEl: HTMLCanvasElement;
    private uiHintsEl: HTMLCanvasElement;
    private undoActions: Array<ImageData>;
    private stateIndex: number;
    private opacityToggle: ToggleButton;
    private coverToggle: ToggleButton;
    private toolbox;
    
    constructor(private mapImg: HTMLImageElement, toolsDiv: HTMLElement, overlay: HTMLCanvasElement, uiHintsOverlay: HTMLCanvasElement) {
        this.mapImg = mapImg;
        this.canvasEl = overlay;
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
        this.toolbox.install(this.canvasEl, this.uiHintsEl, toolsDiv);

        this.addCanvasHandlers(this.canvasEl);
        this.addImageLoadHandler(this.mapImg);

        this.loadImage("img/default-map.png");
    }

    createUndoButton() {
        let ctx = this.canvasEl.getContext("2d");

        return this.createButton("Undo", "img/undo.png", "z", () => {
            if (this.stateIndex > 0) {
                this.stateIndex--;
                ctx.putImageData(this.undoActions[this.stateIndex], 0, 0);
            }
        });
    }

    createRedoButton() {
        let ctx = this.canvasEl.getContext("2d");

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
                                    this.canvasEl.style.opacity = "1";
                                },
                                () => {
                                    this.canvasEl.style.opacity = "";
                                });
    }

    createCoverToggleButton() {
        let ctx = this.canvasEl.getContext("2d");

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

    addCanvasHandlers(canvasEl) {
        let ctx = this.canvasEl.getContext("2d"),
            uiHintsCtx = this.uiHintsEl.getContext("2d");

        canvasEl.addEventListener("mousedown", evt => {
            this.toolbox.currentTool.onStart(evt);
        }, false);
        canvasEl.addEventListener("mouseup", evt => {
            this.toolbox.currentTool.onStop(evt);
            // Take a snapshot of the canvasEl for undo purposes
            this.stateIndex++;
            this.undoActions = this.undoActions.slice(0, this.stateIndex);
            this.undoActions[this.stateIndex] =
                ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
        }, false);
        canvasEl.addEventListener("mousemove", evt => {
            this.toolbox.currentTool.onMove(evt);
        }, false);
        canvasEl.addEventListener("mouseout", () => {
            uiHintsCtx.clearRect(0,
                                 0,
                                 this.uiHintsEl.width,
                                 this.uiHintsEl.height);
        });
    }

    addImageLoadHandler(imgEl) {
        imgEl.addEventListener("load", () => {
            this.canvasEl.height = imgEl.height;
            this.canvasEl.width = imgEl.width;
            let ctx = this.canvasEl.getContext("2d");
            ctx.fillRect(0, 0, this.canvasEl.width, this.canvasEl.height);

            this.uiHintsEl.height = imgEl.height;
            this.uiHintsEl.width = imgEl.width;
            let uiHintsCtx = this.uiHintsEl.getContext("2d");
            uiHintsCtx.clearRect(0, 0, this.uiHintsEl.width, this.uiHintsEl.height);

            this.stateIndex = 0;
            this.undoActions = [ctx.getImageData(0,
                                                 0,
                                                 this.canvasEl.width,
                                                 this.canvasEl.height)];
            imgEl.style.visibility = "";

            this.opacityToggle.disable();
            this.coverToggle.disable();
        });
    }

    loadImage(imageUrl) {
        this.mapImg.style.visibility = "hidden";
        // Setting "src" will load the image, and the "load" event
        // will take care of the rest
        this.mapImg.src = imageUrl;
    }
}
