import {MapDiscovererTool, MapOperation, MapToolProperties} from "./MapDiscovererTool";

export default class RectangleTool implements MapDiscovererTool {
    private static title: string = "Rectangle";
    private static img: string = "rectangle.png";
    private static accessKey: string = "r";

    private started: boolean;
    private initialX: number;
    private initialY: number;

    constructor() {
        this.started = false;
    }

    onStart({offsetX, offsetY}, props: MapToolProperties): Array<MapOperation> {
        [this.initialX, this.initialY] = [offsetX, offsetY];
        this.started = true;

        return [
            {op: "clear", layer: "ui"}
        ];
    }

    onMove({offsetX, offsetY}, props: MapToolProperties): Array<MapOperation> {
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

    onStop({offsetX, offsetY}, props: MapToolProperties): Array<MapOperation> {
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

    onCancel({offsetX, offsetY}, props: MapToolProperties): Array<MapOperation> {
        return [
            {op: "clear", layer: "ui"}
        ];
    }
}
