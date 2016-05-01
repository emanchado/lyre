export default class PencilTool {
    private started: boolean;
    private lastX: number;
    private lastY: number;
    private static title: string = "Pencil Tool";
    private static img: string = "pencil.png";
    private static accessKey: string = "p";

    constructor() {
        this.started = false;
    }

    onStart({offsetX, offsetY}, ctx: CanvasRenderingContext2D, uiCtx: CanvasRenderingContext2D) {
        this.started = true;

        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.beginPath();
        ctx.arc(offsetX,
                     offsetY,
                     20,
                     (Math.PI/180)*0,
                     (Math.PI/180)*360,
                     false);
        ctx.fill();
        ctx.closePath();

        this.clearUiHints(uiCtx);

        this.lastX = offsetX;
        this.lastY = offsetY;
    }

    onMove({offsetX, offsetY}, ctx: CanvasRenderingContext2D, uiCtx: CanvasRenderingContext2D) {
        if (this.started) {
            ctx.lineCap = 'round';
            ctx.lineWidth = 40;
            ctx.beginPath();
            ctx.moveTo(this.lastX, this.lastY);
            ctx.lineTo(offsetX, offsetY);
            ctx.stroke();
            ctx.closePath();

            this.lastX = offsetX;
            this.lastY = offsetY;
        } else {
            this.clearUiHints(uiCtx);
            this.drawCircleHint(offsetX, offsetY, uiCtx);
        }
    }

    onStop({offsetX, offsetY}, ctx: CanvasRenderingContext2D, uiCtx: CanvasRenderingContext2D) {
        this.started = false;

        this.drawCircleHint(offsetX, offsetY, uiCtx);
    }

    clearUiHints(uiCtx: CanvasRenderingContext2D) {
        uiCtx.clearRect(0, 0, uiCtx.canvas.width, uiCtx.canvas.height);
    }

    drawCircleHint(x: number, y: number, uiCtx: CanvasRenderingContext2D) {
        uiCtx.strokeStyle = "blue";
        uiCtx.beginPath();
        uiCtx.arc(x,
                  y,
                  20,
                  (Math.PI/180)*0,
                  (Math.PI/180)*360,
                  false);
        uiCtx.stroke();
        uiCtx.closePath();
    }
}
