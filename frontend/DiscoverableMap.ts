export default class DiscoverableMap {
    public containerEl: HTMLDivElement;

    private overlayEl: HTMLCanvasElement;
    private mapImageEl: HTMLImageElement;
    private checkpointIndex: number;
    private checkpoints: Array<ImageData>;
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
        this.overlayEl = document.createElement("canvas");
        this.overlayEl.style.position = "absolute";
        this.overlayEl.style.top = "0";
        this.overlayEl.style.left = "0";
        this.overlayEl.style.opacity = "0.7";
        this.overlayEl.style.cursor = "crosshair";

        this.containerEl.appendChild(this.mapImageEl);
        this.containerEl.appendChild(this.overlayEl);

        this.eventHandlers = {};
        this.resetCheckpoints();

        this.addImageLoadHandler(this.mapImageEl);

        // Setting "src" will load the image, and the "load" event
        // will take care of the rest
        this.mapImageEl.src = this.url;
    }

    addImageLoadHandler(imgEl) {
        imgEl.addEventListener("load", () => {
            this.overlayEl.height = imgEl.height;
            this.overlayEl.width = imgEl.width;

            let ctx = this.overlayEl.getContext("2d");
            ctx.fillRect(0, 0, this.overlayEl.width, this.overlayEl.height);
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
        let ctx = this.getContext();

        // Clear up "future" redo actions
        this.checkpoints = this.checkpoints.slice(0, this.checkpointIndex + 1);

        this.checkpoints.push(ctx.getImageData(0,
                                               0,
                                               this.overlayEl.width,
                                               this.overlayEl.height));
        this.checkpointIndex++;
    }

    undo() {
        if (this.checkpointIndex > 0) {
            this.checkpointIndex--;
            this.getContext().putImageData(
                this.checkpoints[this.checkpointIndex],
                0,
                0
            );
        }
    }

    redo() {
        if (this.checkpointIndex + 1 < this.checkpoints.length) {
            this.checkpointIndex++;
            this.getContext().putImageData(
                this.checkpoints[this.checkpointIndex],
                0,
                0
            );
        }
    }

    /**
     * Given a canvas element, it returns the coordinates of the top-left
     * and bottom-right corners of the smallest rectangle that contains
     * all of the transparent pixels in the given canvas.
     */
    rectangleCoords(): Array<number> {
        var ctx = this.getContext(),
        data = ctx.getImageData(0, 0, this.width, this.height).data,
        coords = [this.width - 1, this.height - 1, 0, 0];

        for (var j = 0, h = this.height; j < h; j++) {
            for (var i = 0, w = this.width; i < w; i++) {
                // Each coordinate is four numbers (RGBA), we're only
                // interested in the last one, the alpha channel
                var dataIndex = (j * w + i) * 4 + 3;

                if (!data[dataIndex]) {
                    coords[0] = Math.min(coords[0], i);
                    coords[1] = Math.min(coords[1], j);
                    coords[2] = Math.max(coords[2], i);
                    coords[3] = Math.max(coords[3], j);
                }
            }
        }

        if (coords[0] > coords[2] || coords[1] > coords[3]) {
            return [0, 0, 0, 0];
        }
        return coords;
    }

    calculateDiscoveredMapArea(): [Array<number>, ImageData] {
        let rCoords = this.rectangleCoords();

        if (rCoords.every((c) => c === 0)) {
            return [rCoords, null];
        }

        let mapImgCanvas = document.createElement("canvas");
        mapImgCanvas.style.display = "none";
        document.body.appendChild(mapImgCanvas);
        mapImgCanvas.width = this.width;
        mapImgCanvas.height = this.height;
        let mapImgCanvasCtx = mapImgCanvas.getContext("2d");
        mapImgCanvasCtx.drawImage(this.mapImageEl, 0, 0);
        let rectangleImageData = mapImgCanvasCtx.getImageData(
            rCoords[0],
            rCoords[1],
            rCoords[2] - rCoords[0],
            rCoords[3] - rCoords[1]
        );
        let filterImageData = this.getContext().getImageData(
            rCoords[0],
            rCoords[1],
            rCoords[2] - rCoords[0],
            rCoords[3] - rCoords[1]
        );
        for (var i = 3, len = filterImageData.data.length; i < len; i += 4) {
            if (filterImageData.data[i]) {
                rectangleImageData.data[i-3] = 0;
                rectangleImageData.data[i-2] = 0;
                rectangleImageData.data[i-1] = 0;
            }
        }

        return [rCoords, rectangleImageData];
    }

    getContext() {
        return this.overlayEl.getContext("2d");
    }
}
