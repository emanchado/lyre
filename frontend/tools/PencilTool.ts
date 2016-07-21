import {MapDiscovererTool, MapOperation, PenProperties} from "./MapDiscovererTool";

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

    onStart({offsetX, offsetY}, props: PenProperties): Array<MapOperation> {
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

    onMove({offsetX, offsetY}, props: PenProperties): Array<MapOperation> {
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

    onStop({offsetX, offsetY}, props: PenProperties): Array<MapOperation> {
        this.started = false;

        return [
            {op: "circle",
             layer: "ui",
             center: [offsetX, offsetY],
             diameter: props.penSize}
        ];
    }
}
