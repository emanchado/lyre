import {MapDiscovererTool, MapOperation, MapToolProperties} from "./MapDiscovererTool";

export default class PencilTool implements MapDiscovererTool {
    private static title: string = "Pencil";
    private static img: string = "pencil.png";
    private static accessKey: string = "p";

    private started: boolean;
    private lastX: number;
    private lastY: number;

    constructor() {
        this.started = false;
    }

    onStart({offsetX, offsetY}, props: MapToolProperties): Array<MapOperation> {
        this.started = true;

        this.lastX = offsetX;
        this.lastY = offsetY;

        return [
            {op: "circle",
             layer: "veil",
             fillStyle: "black",
             center: [offsetX, offsetY],
             diameter: props.penSize},
            {op: "clear", layer: "ui"}
        ];
    }

    onMove({offsetX, offsetY}, props: MapToolProperties): Array<MapOperation> {
        if (!this.started) {
            return [
                {op: "clear", layer: "ui"},
                {op: "circle",
                 layer: "ui",
                 strokeStyle: "blue",
                 fillStyle: "transparent",
                 center: [offsetX, offsetY],
                 diameter: props.penSize}
            ];
        }

        const [lastX, lastY] = [this.lastX, this.lastY];
        this.lastX = offsetX;
        this.lastY = offsetY;
        return [
            {op: "line",
             layer: "veil",
             width: props.penSize,
             start: [lastX, lastY],
             end: [offsetX, offsetY]}
        ];
    }

    onStop({offsetX, offsetY}, props: MapToolProperties): Array<MapOperation> {
        this.started = false;

        return [
            {op: "circle",
             layer: "ui",
             center: [offsetX, offsetY],
             diameter: props.penSize}
        ];
    }

    onCancel({offsetX, offsetY}, props: MapToolProperties): Array<MapOperation> {
        return [
            {op: "clear", layer: "ui"}
        ];
    }
}
