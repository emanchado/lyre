export default class PencilTool {
    private ctx: CanvasRenderingContext2D;
    private uiHintsLayer: HTMLCanvasElement;
    private uiHintsCtx: CanvasRenderingContext2D;
    private started: boolean;
    private lastX: number;
    private lastY: number;
    private static title: string = "Pencil Tool";
    private static img: string = "pencil.png";
    private static accessKey: string = "p";

    constructor(canvas, uiHintsLayer) {
        this.ctx = canvas.getContext('2d');
        this.uiHintsLayer = uiHintsLayer;
        this.uiHintsCtx = this.uiHintsLayer.getContext('2d');
        this.started = false;
    }

    onStart({offsetX, offsetY}) {
        this.started = true;

        this.ctx.fillStyle = "rgba(0,0,0,1)";
        this.ctx.beginPath();
        this.ctx.arc(offsetX,
                     offsetY,
                     20,
                     (Math.PI/180)*0,
                     (Math.PI/180)*360,
                     false);
        this.ctx.fill();
        this.ctx.closePath();

        this.clearUiHints();

        this.lastX = offsetX;
        this.lastY = offsetY;
    }

    onMove({offsetX, offsetY}) {
        if (this.started) {
            this.ctx.lineCap = 'round';
            this.ctx.lineWidth = 40;
            this.ctx.beginPath();
            this.ctx.moveTo(this.lastX, this.lastY);
            this.ctx.lineTo(offsetX, offsetY);
            this.ctx.stroke();
            this.ctx.closePath();

            this.lastX = offsetX;
            this.lastY = offsetY;
        } else {
            this.clearUiHints();
            this.drawCircleHint(offsetX, offsetY);
        }
    }

    onStop({offsetX, offsetY}) {
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
