import PencilTool from "./tools/PencilTool";
import RectangleTool from "./tools/RectangleTool";
import ToggleButton from "./ToggleButton";
import Toolbox from "./Toolbox";
import DiscoverableMap from "./DiscoverableMap";

const WEBSOCKET_URL = "ws://localhost:3000/narrator/ws";

export default class MapDiscoverer {
    private uiHintsEl: HTMLCanvasElement;
    private coverToggle: ToggleButton;
    private toolbox;
    private loadedMaps;
    private currentMap: DiscoverableMap;
    private compositeOperation: string;
    private socket: WebSocket;

    constructor(toolsDiv: HTMLElement, private containerEl: HTMLElement) {
        this.loadedMaps = {};
        this.socket = new WebSocket(WEBSOCKET_URL);
        this.socket.binaryType = "arraybuffer";
        this.socket.onmessage = (message) => {
            console.log("Received", message.data);
        };
        this.socket.onclose = () => {
            this.socket = null;
            setTimeout(() => {
                this.socket = new WebSocket(WEBSOCKET_URL);
                this.socket.binaryType = "arraybuffer";
            }, 5000);
        };

        // Create UI
        this.uiHintsEl = this.createUiHintsLayer();
        this.addUiEventHandlers();
        let undoButton = this.createUndoButton(),
            redoButton = this.createRedoButton(),
            sendButton = this.createSendButton();
        this.coverToggle = this.createCoverToggleButton();
        this.toolbox = new Toolbox([PencilTool, RectangleTool]);

        // Add buttons to the UI
        toolsDiv.appendChild(this.coverToggle.domElement);
        toolsDiv.appendChild(undoButton);
        toolsDiv.appendChild(redoButton);
        toolsDiv.appendChild(sendButton);
        this.toolbox.install(this.uiHintsEl, toolsDiv);

        this.containerEl.appendChild(this.uiHintsEl);
    }

    createUiHintsLayer() {
        const uiLayer = document.createElement("canvas");
        uiLayer.style.position = "absolute";
        uiLayer.style.top = "0";
        uiLayer.style.left = "0";
        uiLayer.style.border = "5px solid #55f";
        uiLayer.style.zIndex = "1000"; // Make sure it's above everything

        return uiLayer;
    }

    loadMap(url: string) {
        if (this.currentMap) {
            this.containerEl.removeChild(this.currentMap.containerEl);
        }

        // TODO: Check how long the URL is when loading locally. It
        // seems to be the whole file as a data URI. In that case,
        // this needs to be profiled for memory usage and maybe get a
        // simple checksum as the loadedMaps key, instead of the whole
        // thing.
        if (!(url in this.loadedMaps)) {
            const map = new DiscoverableMap(url);
            map.init((width, height) => {
                this.uiHintsEl.width = width;
                this.uiHintsEl.height = height;
            });
            this.loadedMaps[url] = map;
            map.containerEl.style.position = "relative";
            map.containerEl.style.top = "5px";
            map.containerEl.style.left = "5px";
            this.coverToggle.disable();
        } else {
            this.uiHintsEl.width = this.loadedMaps[url].width;
            this.uiHintsEl.height = this.loadedMaps[url].height;
        }
        this.currentMap = this.loadedMaps[url];
        this.containerEl.appendChild(this.currentMap.containerEl);
    }

    createUndoButton() {
        return this.createButton("Undo", "/img/undo.png", "z", () => {
            this.currentMap.undo();
        });
    }

    createRedoButton() {
        return this.createButton("Redo", "/img/redo.png", "y", () => {
            this.currentMap.redo();
        });
    }

    createSendButton() {
        return this.createButton("Send to audience", "/img/projector.png", "s", () => {
            let [coords, imageData] = this.currentMap.calculateDiscoveredMapArea();

            if (this.socket && imageData) {
                this.socket.send(JSON.stringify({
                    type: "map-metadata",
                    width: coords[2] - coords[0],
                    height: coords[3] - coords[1]
                }));

                const binary = new Uint8Array(imageData.data.length);
                for (var i = 0, len = imageData.data.length; i < len; i++) {
                    binary[i] = imageData.data[i];
                }
                this.socket.send(binary.buffer);
            }
        });
    }

    createCoverToggleButton() {
        return new ToggleButton(
            ["Uncover Mode", "Cover Mode"],
            "/img/eraser.png",
            "c",
            () => {
                this.compositeOperation = "source-over";
            },
            () => {
                this.compositeOperation = "destination-out";
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

    addUiEventHandlers() {
        let uiHintsCtx = this.uiHintsEl.getContext("2d");

        this.uiHintsEl.addEventListener("mousedown", evt => {
            const ctx = this.currentMap.getContext();
            ctx.save();
            ctx.globalCompositeOperation = this.compositeOperation;
            this.toolbox.currentTool.onStart(evt, ctx);
            ctx.restore();
        }, false);
        this.uiHintsEl.addEventListener("mouseup", evt => {
            const ctx = this.currentMap.getContext();
            ctx.save();
            ctx.globalCompositeOperation = this.compositeOperation;
            this.toolbox.currentTool.onStop(evt, ctx);
            ctx.restore();
            // Take a snapshot of the map for undo purposes
            this.currentMap.saveCheckpoint();
        }, false);
        this.uiHintsEl.addEventListener("mousemove", evt => {
            const ctx = this.currentMap.getContext();
            ctx.save();
            ctx.globalCompositeOperation = this.compositeOperation;
            this.toolbox.currentTool.onMove(evt, ctx);
            ctx.restore();
        }, false);
        this.uiHintsEl.addEventListener("mouseout", () => {
            uiHintsCtx.clearRect(0,
                                 0,
                                 this.uiHintsEl.width,
                                 this.uiHintsEl.height);
        }, false);
        this.uiHintsEl.addEventListener("load", () => {
            this.uiHintsEl.width = this.currentMap.width;
            this.uiHintsEl.height = this.currentMap.height;
            // Do we need the code below? Isn't it enough to set width
            // and height to clear it?
            let uiHintsCtx = this.uiHintsEl.getContext("2d");
            uiHintsCtx.clearRect(0, 0, this.uiHintsEl.width, this.uiHintsEl.height);
        }, false)
    }
}
