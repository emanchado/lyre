import {MapDiscovererTool, CoordinateEvent} from "./MapDiscovererTool";

export default class PencilTool implements MapDiscovererTool {
    private started: boolean;
    private lastX: number;
    private lastY: number;
    private static title: string = "Pencil Tool";
    private static img: string = "pencil.png";
    private static accessKey: string = "p";

    constructor() {
        this.started = false;
    }

    onStart({offsetX, offsetY}, ctx: CanvasRenderingContext2D, uiCtx: CanvasRenderingContext2D, penSize: number) {
        this.started = true;

        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.beginPath();
        ctx.arc(offsetX,
                offsetY,
                penSize / 2,
                (Math.PI/180)*0,
                (Math.PI/180)*360,
                false);
        ctx.fill();
        ctx.closePath();

        this.clearUiHints(uiCtx);

        this.lastX = offsetX;
        this.lastY = offsetY;
    }

    onMove({offsetX, offsetY}, ctx: CanvasRenderingContext2D, uiCtx: CanvasRenderingContext2D, penSize: number) {
        if (this.started) {
            ctx.lineCap = 'round';
            ctx.lineWidth = penSize;
            ctx.beginPath();
            ctx.moveTo(this.lastX, this.lastY);
            ctx.lineTo(offsetX, offsetY);
            ctx.stroke();
            ctx.closePath();

            this.lastX = offsetX;
            this.lastY = offsetY;
        } else {
            this.clearUiHints(uiCtx);
            this.drawCircleHint(offsetX, offsetY, penSize, uiCtx);
        }
    }

    onStop({offsetX, offsetY}, ctx: CanvasRenderingContext2D, uiCtx: CanvasRenderingContext2D, penSize: number) {
        this.started = false;

        this.drawCircleHint(offsetX, offsetY, penSize, uiCtx);
    }

    clearUiHints(uiCtx: CanvasRenderingContext2D) {
        uiCtx.clearRect(0, 0, uiCtx.canvas.width, uiCtx.canvas.height);
    }

    drawCircleHint(x: number, y: number, penSize: number, uiCtx: CanvasRenderingContext2D) {
        uiCtx.strokeStyle = "blue";
        uiCtx.beginPath();
        uiCtx.arc(x,
                  y,
                  penSize / 2,
                  (Math.PI/180)*0,
                  (Math.PI/180)*360,
                  false);
        uiCtx.stroke();
        uiCtx.closePath();
    }
}
