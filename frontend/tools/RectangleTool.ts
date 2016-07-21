import {MapDiscovererTool, MapOperation, PenProperties} from "./MapDiscovererTool";

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

    onStart({offsetX, offsetY}, props: PenProperties): Array<MapOperation> {
        [this.initialX, this.initialY] = [offsetX, offsetY];
        this.started = true;

        return [
            {op: "clear", layer: "ui"}
        ];
    }

    onMove({offsetX, offsetY}, props: PenProperties): Array<MapOperation> {
        const actions = [{op: "clear", layer: "ui"}];

        if (this.started) {
            return [
                {op: "clear", layer: "ui"},
                {op: "rect",
                 layer: "ui",
                 strokeStyle: "blue",
                 start: [this.initialX, this.initialY],
                 end: [offsetX - this.initialX, offsetY - this.initialY]}
            ];
        }
    }

    onStop({offsetX, offsetY}, props: PenProperties): Array<MapOperation> {
        this.started = false;

        return [
            {op: "clear", layer: "ui"},
            {op: "rect",
             layer: "veil",
             fillStyle: "black",
             start: [this.initialX, this.initialY],
             end: [offsetX - this.initialX, offsetY - this.initialY]}
        ];
    }
}
