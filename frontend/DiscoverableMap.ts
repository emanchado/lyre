import { minimumRectangle } from "./ImageProcessing";
import { MapMarkerSet } from "./MapMarkers";

export default class DiscoverableMap {
    public containerEl: HTMLDivElement;
    public markers: MapMarkerSet;

    private veilEl: HTMLCanvasElement;
    private markerEl: HTMLCanvasElement;
    private mapImageEl: HTMLImageElement;
    private checkpointIndex: number;
    private checkpoints: Array<{veil: ImageData, markers: ImageData}>;
    private eventHandlers;
    private onLoadCallback: Function;

    constructor(public url: string) {}

    get width(): number {
        return this.mapImageEl.width;
    }

    get height(): number {
        return this.mapImageEl.height;
    }

    init(onLoadCallback: Function) {
        this.onLoadCallback = onLoadCallback;
        this.containerEl = document.createElement("div");

        this.mapImageEl = document.createElement("img");
        this.mapImageEl.style.position = "relative";
        this.mapImageEl.style.top = "0";
        this.mapImageEl.style.left = "0";
        this.mapImageEl.style.visibility = "hidden"; // Reset on load
        this.veilEl = document.createElement("canvas");
        this.veilEl.style.position = "absolute";
        this.veilEl.style.top = "0";
        this.veilEl.style.left = "0";
        this.veilEl.style.opacity = "0.7";
        this.veilEl.style.cursor = "crosshair";
        this.markerEl = document.createElement("canvas");
        this.markerEl.style.position = "absolute";
        this.markerEl.style.top = "0";
        this.markerEl.style.left = "0";
        this.markerEl.style.cursor = "crosshair";

        this.containerEl.appendChild(this.mapImageEl);
        this.containerEl.appendChild(this.markerEl);
        this.containerEl.appendChild(this.veilEl);

        this.eventHandlers = {};
        this.resetCheckpoints();

        this.addImageLoadHandler(this.mapImageEl);
        this.markers = new MapMarkerSet(this.markerEl);

        // Setting "src" will load the image, and the "load" event
        // will take care of the rest
        this.mapImageEl.src = this.url;
    }

    addImageLoadHandler(imgEl) {
        imgEl.addEventListener("load", () => {
            [this.veilEl.width, this.veilEl.height] = [imgEl.width, imgEl.height];
            let ctx = this.veilEl.getContext("2d");
            ctx.fillRect(0, 0, this.veilEl.width, this.veilEl.height);
            [this.markerEl.width, this.markerEl.height] = [imgEl.width, imgEl.height];

            this.resetCheckpoints();

            imgEl.style.visibility = "";

            this.onLoadCallback(imgEl.width, imgEl.height);
        });
    }

    resetCheckpoints() {
        this.checkpointIndex = -1;
        this.checkpoints = [];
        this.saveCheckpoint();
    }

    saveCheckpoint() {
        let veilCtx = this.getVeilContext(),
            markerCtx = this.getMarkerContext();

        // Clear up "future" redo actions
        this.checkpoints = this.checkpoints.slice(0, this.checkpointIndex + 1);

        const { width, height } = this.veilEl;
        this.checkpoints.push({veil: veilCtx.getImageData(0,
                                                          0,
                                                          width,
                                                          height),
                               markers: markerCtx.getImageData(0,
                                                               0,
                                                               width,
                                                               height)});
        this.checkpointIndex++;
    }

    undo() {
        if (this.checkpointIndex > 0) {
            this.checkpointIndex--;
            const { veil, markers } = this.checkpoints[this.checkpointIndex];
            this.getVeilContext().putImageData(veil, 0, 0);
            this.getMarkerContext().putImageData(markers, 0, 0);
        }
    }

    redo() {
        if (this.checkpointIndex + 1 < this.checkpoints.length) {
            this.checkpointIndex++;
            const { veil, markers } = this.checkpoints[this.checkpointIndex];
            this.getVeilContext().putImageData(veil, 0, 0);
            this.getMarkerContext().putImageData(markers, 0, 0);
        }
    }

    calculateDiscoveredMapArea(): ImageData {
        const rCoords = minimumRectangle(this.veilEl, (r,g,b,a) => a === 0);

        if (rCoords.every((c) => c === 0)) {
            return null;
        }

        const [x, y, w, h] = [rCoords[0],
                              rCoords[1],
                              rCoords[2] - rCoords[0] + 1,
                              rCoords[3] - rCoords[1] + 1];

        const mapImgCanvas = document.createElement("canvas");
        mapImgCanvas.style.display = "none";
        document.body.appendChild(mapImgCanvas);
        mapImgCanvas.width = this.width;
        mapImgCanvas.height = this.height;
        const mapImgCanvasCtx = mapImgCanvas.getContext("2d");
        mapImgCanvasCtx.drawImage(this.mapImageEl, 0, 0);

        // Start with the relevant image rectangle
        const resultImageData = mapImgCanvasCtx.getImageData(x, y, w, h);
        document.body.removeChild(mapImgCanvas);

        // Add markers
        const mapMarkerData = this.getMarkerContext().getImageData(x, y, w, h);
        for (var i = 0, len = mapMarkerData.data.length; i < len; i += 4) {
            if (mapMarkerData.data[i+3]) {
                resultImageData.data[i] = mapMarkerData.data[i];
                resultImageData.data[i+1] = mapMarkerData.data[i+1];
                resultImageData.data[i+2] = mapMarkerData.data[i+2];
                resultImageData.data[i+3] = mapMarkerData.data[i+3];
            }
        }

        // Filter still-covered parts
        const filterImageData = this.getVeilContext().getImageData(x, y, w, h);
        for (var i = 3, len = filterImageData.data.length; i < len; i += 4) {
            if (filterImageData.data[i]) {
                resultImageData.data[i-3] = 0;
                resultImageData.data[i-2] = 0;
                resultImageData.data[i-1] = 0;
            }
        }

        return resultImageData;
    }

    getVeilContext() {
        return this.veilEl.getContext("2d");
    }

    getMarkerContext() {
        return this.markerEl.getContext("2d");
    }
}
