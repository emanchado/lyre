export default class PencilTool {
    private uiHintsCtx: CanvasRenderingContext2D;
    private started: boolean;
    private lastX: number;
    private lastY: number;
    private static title: string = "Pencil Tool";
    private static img: string = "pencil.png";
    private static accessKey: string = "p";

    constructor(private uiHintsLayer: HTMLCanvasElement) {
        this.uiHintsLayer = uiHintsLayer;
        this.uiHintsCtx = this.uiHintsLayer.getContext('2d');
        this.started = false;
    }

    onStart({offsetX, offsetY}, ctx: CanvasRenderingContext2D) {
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

        this.clearUiHints();

        this.lastX = offsetX;
        this.lastY = offsetY;
    }

    onMove({offsetX, offsetY}, ctx: CanvasRenderingContext2D) {
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
            this.clearUiHints();
            this.drawCircleHint(offsetX, offsetY);
        }
    }

    onStop({offsetX, offsetY}, ctx: CanvasRenderingContext2D) {
        this.started = false;

        this.drawCircleHint(offsetX, offsetY);
    }

    clearUiHints() {
        this.uiHintsCtx.clearRect(0, 0, this.uiHintsLayer.width, this.uiHintsLayer.height);
    }

    drawCircleHint(x, y) {
        this.uiHintsCtx.strokeStyle = "blue";
        this.uiHintsCtx.beginPath();
        this.uiHintsCtx.arc(x,
                            y,
                            20,
                            (Math.PI/180)*0,
                            (Math.PI/180)*360,
                            false);
        this.uiHintsCtx.stroke();
        this.uiHintsCtx.closePath();
    }
}
