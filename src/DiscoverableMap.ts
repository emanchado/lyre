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
        let ctx = this.overlayEl.getContext("2d");

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

    getContext() {
        return this.overlayEl.getContext("2d");
    }
}
