export interface CoordinateEvent {
    offsetX: number;
    offsetY: number;
}

export interface MapDiscovererTool {
    onStart(CoordinateEvent, ctx: CanvasRenderingContext2D, uiCtx: CanvasRenderingContext2D, penSize: number);
    onMove(CoordinateEvent, ctx: CanvasRenderingContext2D, uiCtx: CanvasRenderingContext2D, penSize: number);
    onStop(CoordinateEvent, ctx: CanvasRenderingContext2D, uiCtx: CanvasRenderingContext2D, penSize: number);
}

export default MapDiscovererTool;
