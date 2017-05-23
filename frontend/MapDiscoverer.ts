/// <reference path="riot-ts.d.ts" />

import PencilTool from "./tools/PencilTool";
import RectangleTool from "./tools/RectangleTool";
import MarkerTool from "./tools/MarkerTool";
import MoveMarkerTool from "./tools/MoveMarkerTool";
import DiscoverableMap from "./DiscoverableMap";
import { MapDiscovererTool, MapOperation, ClearOperation, CircleOperation, LineOperation, RectangleOperation, ImageOperation, ClearMarkerOperation, CoordinateEvent, MapToolProperties } from "./tools/MapDiscovererTool";
import { Marker } from "./MapMarkers";

type OperationDispatcher = (Operation, MapToolProperties) => void;

const DISPATCHERS: { [actionName: string]: OperationDispatcher } = {
    clear: function clear(operation: ClearOperation, props) {
        const layer = props[operation.layer],
              { width, height } = layer.canvas;

        layer.clearRect(0, 0, width, height);
    },

    circle: function circle(operation: CircleOperation, props) {
        const layer = props[operation.layer];

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

    line: function line(operation: LineOperation, props) {
        const layer = props[operation.layer];

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

    rect: function rect(operation: RectangleOperation, props) {
        const layer = props[operation.layer];

        layer.strokeStyle = operation.strokeStyle || "transparent";
        layer.fillStyle = operation.fillStyle || "transparent";

        layer.lineWidth = operation.lineWidth || 1;
        layer.beginPath();
        layer.rect(operation.start[0], operation.start[1],
                   operation.end[0], operation.end[1]);
        layer.stroke();
        layer.fill();
    },

    image: function image(operation: ImageOperation, props) {
        if (operation.layer === "markers") {
            props.markers.push({url: operation.src,
                                x: operation.center[0],
                                y: operation.center[1]});
        } else {
            const layer = props[operation.layer];

            let tmp = document.createElement("img");
            tmp.src = operation.src;
            layer.drawImage(tmp, operation.center[0], operation.center[1]);
            tmp = null;
        }
    },

    clearMarker: function clearMarker(operation: ClearMarkerOperation, props) {
        props.marker = null;
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
    private markerTools: Array<MarkerTool>;
    private moveMarkerTool: MoveMarkerTool;
    private showMarkerToolsDropdown: boolean;
    private currentPaintTool: MapDiscovererTool;
    private selectedPaintTool: MapDiscovererTool;
    private lastUsedMarker: MarkerTool;
    private toolProperties: MapToolProperties;

    constructor(opts) {
        super();

        this.socket = opts.socket;
        this.onClose = opts.onclose;
        this.loadedMaps = {};
        this.currentMapUrl = null;
        this.paintMode = "uncover";
        this.paintTools = [new PencilTool(), new RectangleTool()];
        const usedMarkers = opts.markerpool.filter(
            m => opts.storymarkers.indexOf(m.id) !== -1
        );
        this.markerTools = usedMarkers.length > 0 ?
            usedMarkers.map(
                m => new MarkerTool(m.title, "/stories/markers/" + m.url)
            ) :
            [new MarkerTool("pin", "/img/generic-marker.png")];
        this.moveMarkerTool = new MoveMarkerTool();
        this.showMarkerToolsDropdown = false;
        this.currentPaintTool = this.selectedPaintTool = this.paintTools[0];
        this.lastUsedMarker = this.markerTools[0];
        this.toolProperties = { penSize: 40, marker: null };

        this.paintToolClass = this.paintToolClass.bind(this);
        this.onPaintToolClickHandler = this.onPaintToolClickHandler.bind(this);
        this.onMarkerToolClickHandler = this.onMarkerToolClickHandler.bind(this);
        this.onMarkerToolsHover = this.onMarkerToolsHover.bind(this);
        this.onMarkerToolsOut = this.onMarkerToolsOut.bind(this);
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
        const imageData = this.loadedMaps[this.currentMapUrl].calculateDiscoveredMapArea();

        if (this.socket && imageData) {
            this.socket.send(JSON.stringify({
                type: "map-metadata",
                width: imageData.width,
                height: imageData.height
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
        this.toolProperties.penSize = parseInt(evt.target.value, 10);
    }

    private dispatchOperation(operation: MapOperation, ctx) {
        const dispatcher = DISPATCHERS[operation.op];

        if (!dispatcher) {
            console.error("Invalid operation", operation);
            return;
        }

        dispatcher(operation, ctx);
    }

    private dispatchAction(aType: String, evt: CoordinateEvent) {
        if (!this.currentMapUrl) {
            return;
        }

        const methodName = "on" + aType[0].toUpperCase() + aType.slice(1);

        this.withPencil((ctx, props) => {
            const operations = this.currentPaintTool[methodName](evt, props);
            if (!operations) {
                return;
            }

            operations.forEach(operation => this.dispatchOperation(operation,
                                                                   ctx));
        });
    }

    onmousedown(evt) {
        // Special case for moving a marker: if the cursor is on top
        // of one, switch the tool temporarily to moveMarkerTool
        const markerOnCursor =
            this.loadedMaps[this.currentMapUrl].markers.remove(evt.offsetX,
                                                               evt.offsetY);
        if (markerOnCursor) {
            this.toolProperties.marker = markerOnCursor;
            this.currentPaintTool = this.moveMarkerTool;
        }

        this.dispatchAction("start", evt);
    }

    onmouseup(evt) {
        this.dispatchAction("stop", evt);
        // Normally this assignment will be a no-op, but when we
        // switch to the move tool and finish moving, we have to turn
        // back to the tool selected by the user.
        this.currentPaintTool = this.selectedPaintTool;
        // Take a snapshot of the map for undo purposes
        this.loadedMaps[this.currentMapUrl].saveCheckpoint();
    }

    onmousemove(evt) {
        this.dispatchAction("move", evt);
    }

    onmouseout(evt) {
        this.dispatchAction("cancel", evt);
        // Normally this assignment will be a no-op, but when we
        // switch to the move tool and finish moving, we have to turn
        // back to the tool selected by the user.
        this.currentPaintTool = this.selectedPaintTool;
    }

    paintToolClass(tool) {
        return this.currentPaintTool === tool ? "active" : "";
    }

    onMarkerToolsHover(e) {
        this.showMarkerToolsDropdown = true;
    }

    onMarkerToolsOut(e) {
        this.showMarkerToolsDropdown = false;
    }

    onPaintToolClickHandler(tool) {
        return e => {
            this.currentPaintTool = this.selectedPaintTool = tool;
        };
    }

    onMarkerToolClickHandler(tool) {
        return e => {
            this.currentPaintTool = this.selectedPaintTool =
                this.lastUsedMarker = tool;
        };
    }

    private compositeOperationForMode(paintMode) {
        return paintMode === "uncover" ? "destination-out" : "source-over";
    }

    private withPencil(operation) {
        const veilCtx = this.loadedMaps[this.currentMapUrl].getVeilContext(),
              uiHintsCtx = this.uiHints.getContext("2d"),
              markers = this.loadedMaps[this.currentMapUrl].markers,
              layers = {veil: veilCtx, ui: uiHintsCtx, markers: markers};

        veilCtx.save();
        veilCtx.globalCompositeOperation =
            this.paintMode === "uncover" ? "destination-out" : "source-over";
        operation(layers, this.toolProperties);
        veilCtx.restore();
    }
}
