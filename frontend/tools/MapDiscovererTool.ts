type Coords = Array<number>;
interface BasicOperation {
    op: string,
    layer: "veil" | "ui",
    strokeStyle?: string,
    fillStyle?: string
};
export interface ClearOperation extends BasicOperation {
    op: "clear"
};
export interface LineOperation extends BasicOperation {
    op: "line",
    start: Coords,
    end: Coords,
    width: number
};
export interface CircleOperation extends BasicOperation {
    op: "circle",
    center: Coords,
    width?: number,
    diameter: number
};
export interface RectangleOperation extends BasicOperation {
    op: "rect",
    start: Coords,
    end: Coords,
    lineWidth?: number
};

export type MapOperation =
    ClearOperation |
    LineOperation |
    CircleOperation |
    RectangleOperation;

export interface CoordinateEvent {
    offsetX: number;
    offsetY: number;
}

export interface PenProperties {
    penSize: number;
}

export interface MapDiscovererTool {
    onStart(CoordinateEvent, props: PenProperties): Array<MapOperation>;
    onMove(CoordinateEvent, props: PenProperties): Array<MapOperation>;
    onStop(CoordinateEvent, props: PenProperties): Array<MapOperation>;
}

export default MapDiscovererTool;
