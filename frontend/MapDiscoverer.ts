/// <reference path="riot-ts.d.ts" />

import PencilTool from "./tools/PencilTool";
import RectangleTool from "./tools/RectangleTool";
import DiscoverableMap from "./DiscoverableMap";
import { MapDiscovererTool, MapOperation, ClearOperation, CircleOperation, LineOperation, RectangleOperation } from "./tools/MapDiscovererTool";

const DISPATCHERS = {
    clear: function clear(operation: ClearOperation, layers) {
        const layer = layers[operation.layer],
              { width, height } = layer.canvas;

        layer.clearRect(0, 0, width, height);
    },

    circle: function circle(operation: CircleOperation, layers) {
        const layer = layers[operation.layer];

        layer.strokeStyle = operation.strokeStyle;
        layer.fillStyle = operation.fillStyle;
        layer.beginPath();
        layer.arc(operation.center[0],
                  operation.center[1],
                  operation.diameter / 2,
                  (Math.PI/180)*0,
                  (Math.PI/180)*360,
                  false);
        layer.stroke();
        layer.fill();
        layer.closePath();
    },

    line: function line(operation: LineOperation, layers) {
        const layer = layers[operation.layer];

        layer.strokeStyle = operation.strokeStyle;
        layer.fillStyle = operation.fillStyle;
        layer.lineCap = 'round';
        layer.lineWidth = operation.width || 1;
        layer.beginPath();
        layer.moveTo(operation.start[0], operation.start[1]);
        layer.lineTo(operation.end[0], operation.end[1]);
        layer.stroke();
        layer.closePath();
    },

    rect: function rect(operation: RectangleOperation, layers) {
        const layer = layers[operation.layer];

        layer.strokeStyle = operation.strokeStyle || "transparent";
        layer.fillStyle = operation.fillStyle || "transparent";

        layer.lineWidth = operation.lineWidth || 1;
        layer.beginPath();
        layer.rect(operation.start[0], operation.start[1],
                   operation.end[0], operation.end[1]);
        layer.stroke();
        layer.fill();
    }
};

@template("/templates/mapdiscoverer.html")
export default class MapDiscovererApp extends Riot.Element
{
    currentMapUrl: string;
    private socket: WebSocket;
    private onClose: Function;
    private loadedMaps: {[url: string]: DiscoverableMap};
    private uiHints: HTMLCanvasElement;
    private mapContainer: HTMLElement;
    private paintMode: string;
    private paintTools: Array<MapDiscovererTool>;
    private currentPaintTool: MapDiscovererTool;
    private penSize: number;

    constructor(opts) {
        super();

        this.socket = opts.socket;
        this.onClose = opts.onclose;
        this.loadedMaps = {};
        this.currentMapUrl = null;
        this.paintMode = "uncover";
        this.paintTools = [new PencilTool(), new RectangleTool()];
        this.currentPaintTool = this.paintTools[0];
        this.penSize = 40;

        this.paintToolClass = this.paintToolClass.bind(this);
        this.onPaintToolClickHandler = this.onPaintToolClickHandler.bind(this);
    }

    mounted() {
        this.uiHints = this.root.querySelector("canvas.ui-hints") as HTMLCanvasElement;
        this.mapContainer = this.root.querySelector(".map-container") as HTMLElement;
    }

    loadMap(url: string) {
        if (this.currentMapUrl) {
            this.mapContainer.removeChild(this.loadedMaps[this.currentMapUrl].containerEl);
        }

        if (!(url in this.loadedMaps)) {
            const map = new DiscoverableMap(url);
            map.init((width, height) => {
                this.uiHints.width = width;
                this.uiHints.height = height;
            });
            this.loadedMaps[url] = map;
            map.containerEl.className = "map-img";
            // TODO: put this back
            // this.coverToggle.disable();
        } else {
            this.uiHints.width = this.loadedMaps[url].width;
            this.uiHints.height = this.loadedMaps[url].height;
        }
        this.currentMapUrl = url;
        this.mapContainer.appendChild(this.loadedMaps[this.currentMapUrl].containerEl);
    }

    undo() {
        this.loadedMaps[this.currentMapUrl].undo();
    }

    redo() {
        this.loadedMaps[this.currentMapUrl].redo();
    }

    sendToAudience(evt) {
        let [coords, imageData] = this.loadedMaps[this.currentMapUrl].calculateDiscoveredMapArea();

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
    }

    coverUncover(evt) {
        this.paintMode = this.paintMode === "uncover" ? "cover" : "uncover";
    }

    changePenSize(evt) {
        this.penSize = parseInt(evt.target.value, 10);
    }

    private dispatchOperation(operation: MapOperation, layers) {
        const dispatcher = DISPATCHERS[operation.op];

        if (!dispatcher) {
            console.error("Invalid operation", operation);
            return;
        }

        dispatcher(operation, layers);
    }

    private dispatchAction(aType, evt) {
        if (!this.currentMapUrl) {
            return;
        }

        const methodName = "on" + aType[0].toUpperCase() + aType.slice(1);

        this.withPencil((layers, props) => {
            const operations = this.currentPaintTool[methodName](evt, props);
            if (!operations) {
                return;
            }

            operations.forEach(operation => this.dispatchOperation(operation,
                                                                   layers));
        });
    }

    onmousedown(evt) {
        this.dispatchAction("start", evt);
    }

    onmouseup(evt) {
        this.dispatchAction("stop", evt);
        // Take a snapshot of the map for undo purposes
        this.loadedMaps[this.currentMapUrl].saveCheckpoint();
    }

    onmousemove(evt) {
        this.dispatchAction("move", evt);
    }

    onmouseout(evt) {
        const uiHintsCtx = this.uiHints.getContext("2d");
        uiHintsCtx.clearRect(0, 0, this.uiHints.width, this.uiHints.height);
    }

    paintToolClass(tool) {
        return this.currentPaintTool === tool ? "active" : "";
    }

    onPaintToolClickHandler(tool) {
        return e => {
            this.currentPaintTool = tool;
        };
    }

    private compositeOperationForMode(paintMode) {
        return paintMode === "uncover" ? "destination-out" : "source-over";
    }

    private withPencil(operation) {
        const ctx = this.loadedMaps[this.currentMapUrl].getContext(),
              uiHintsCtx = this.uiHints.getContext("2d"),
              layers = {veil: ctx, ui: uiHintsCtx, markers: null};

        ctx.save();
        ctx.globalCompositeOperation =
            this.paintMode === "uncover" ? "destination-out" : "source-over";
        operation(layers, {penSize: this.penSize});
        ctx.restore();
    }
}
