import {MapDiscovererTool, CoordinateEvent} from "./MapDiscovererTool";

export default class RectangleTool implements MapDiscovererTool {
    private started: boolean;
    private initialX: number;
    private initialY: number;
    private static title: string = "Rectangle Tool";
    private static img: string = "rectangle.png";
    private static accessKey: string = "r";

    constructor() {
        this.started = false;
    }

    onStart({offsetX, offsetY}, ctx: CanvasRenderingContext2D, uiCtx: CanvasRenderingContext2D, penSize: number) {
        [this.initialX, this.initialY] = [offsetX, offsetY];
        this.clearUiHints(uiCtx);
        this.started = true;
    }

    onMove({offsetX, offsetY}, ctx: CanvasRenderingContext2D, uiCtx: CanvasRenderingContext2D, penSize: number) {
        this.clearUiHints(uiCtx);

        if (this.started) {
            uiCtx.save();

            uiCtx.strokeStyle = "blue";

            uiCtx.lineWidth = 1;
            uiCtx.beginPath();
            uiCtx.rect(this.initialX,           this.initialY,
                       offsetX - this.initialX, offsetY - this.initialY);
            uiCtx.stroke();

            uiCtx.restore();
        }
    }

    onStop({offsetX, offsetY}, ctx: CanvasRenderingContext2D, uiCtx: CanvasRenderingContext2D, penSize: number) {
        this.clearUiHints(uiCtx);

        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(this.initialX, this.initialY,
                      offsetX - this.initialX, offsetY - this.initialY);
        ctx.fill();
        ctx.stroke();

        this.started = false;
    }

    clearUiHints(uiCtx: CanvasRenderingContext2D) {
        uiCtx.clearRect(0, 0, uiCtx.canvas.width, uiCtx.canvas.height);
    }
}
