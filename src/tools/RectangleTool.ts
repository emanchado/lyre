export default class RectangleTool {
    private uiHintsCtx: CanvasRenderingContext2D;
    private started: boolean;
    private initialX: number;
    private initialY: number;
    private static title: string = "Rectangle Tool";
    private static img: string = "rectangle.png";
    private static accessKey: string = "r";

    constructor(private uiHintsLayer: HTMLCanvasElement) {
        this.uiHintsCtx = uiHintsLayer.getContext("2d");
        this.started = false;
    }

    onStart({offsetX, offsetY}, ctx: CanvasRenderingContext2D) {
        [this.initialX, this.initialY] = [offsetX, offsetY];
        this.clearUiHints();
        this.started = true;
    }

    onMove({offsetX, offsetY}, ctx: CanvasRenderingContext2D) {
        this.clearUiHints();

        if (this.started) {
            let origStrokeStyle = this.uiHintsCtx.strokeStyle;

            this.uiHintsCtx.strokeStyle = "blue";

            this.uiHintsCtx.lineWidth = 1;
            this.uiHintsCtx.beginPath();
            this.uiHintsCtx.rect(this.initialX, this.initialY,
                                 offsetX - this.initialX, offsetY - this.initialY);
            this.uiHintsCtx.stroke();

            this.uiHintsCtx.strokeStyle = origStrokeStyle;
        }
    }

    onStop({offsetX, offsetY}, ctx: CanvasRenderingContext2D) {
        this.clearUiHints();

        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(this.initialX, this.initialY,
                      offsetX - this.initialX, offsetY - this.initialY);
        ctx.fill();
        ctx.stroke();

        this.started = false;
    }

    clearUiHints() {
        this.uiHintsCtx.clearRect(0,
                                  0,
                                  this.uiHintsLayer.width,
                                  this.uiHintsLayer.height);
    }
}
