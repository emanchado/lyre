import { Marker } from "./MapMarkers";

type Coords = [number, number];
interface Operation {
    op: string,
    layer: "veil" | "ui" | "markers",
    strokeStyle?: string,
    fillStyle?: string
};
export interface ClearOperation extends Operation {
    op: "clear"
};
export interface LineOperation extends Operation {
    op: "line",
    start: Coords,
    end: Coords,
    width: number
};
export interface CircleOperation extends Operation {
    op: "circle",
    center: Coords,
    width?: number,
    diameter: number
};
export interface RectangleOperation extends Operation {
    op: "rect",
    start: Coords,
    end: Coords,
    lineWidth?: number
};
export interface ImageOperation extends Operation {
    op: "image",
    center: Coords,
    src: string
};
export interface ClearMarkerOperation extends Operation {
    op: "clearMarker"
};

export type MapOperation =
    ClearOperation |
    LineOperation |
    CircleOperation |
    RectangleOperation |
    ImageOperation |
    ClearMarkerOperation;

export interface CoordinateEvent {
    offsetX: number;
    offsetY: number;
}

export interface MapToolProperties {
    penSize: number;
    marker: Marker;
}

export interface MapDiscovererTool {
    onStart(CoordinateEvent, props: MapToolProperties): Array<MapOperation>;
    onMove(CoordinateEvent, props: MapToolProperties): Array<MapOperation>;
    onStop(CoordinateEvent, props: MapToolProperties): Array<MapOperation>;
    onCancel(CoordinateEvent, props: MapToolProperties): Array<MapOperation>;
}

export default MapDiscovererTool;
