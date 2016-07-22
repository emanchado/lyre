import { MapDiscovererTool, MapOperation, MapToolProperties } from "./MapDiscovererTool";
import { processImage } from "../ImageProcessing";

export default class MarkerTool implements MapDiscovererTool {
    private blueMarkerUrl: string;

    constructor(private markerImageUrl: string) {
        processImage(this.markerImageUrl, (r, g, b, a) => {
            const sum = r + g + b;
            return sum ?
                [0, 0, sum / 3, a] :
                [0, 0, 0, a];
        }, (err, resultImageUrl) => {
            this.blueMarkerUrl = err ? this.markerImageUrl : resultImageUrl;
        });
    }

    onStart({offsetX, offsetY}, props: MapToolProperties): Array<MapOperation> {
        return [
            {op: "image",
             layer: "markers",
             center: [offsetX, offsetY],
             src: this.markerImageUrl}
        ];
    }

    onMove({offsetX, offsetY}, props: MapToolProperties): Array<MapOperation> {
        return [
            {op: "clear", layer: "ui"},
            {op: "image",
             layer: "ui",
             center: [offsetX, offsetY],
             src: this.blueMarkerUrl}
        ];
    }

    onStop({offsetX, offsetY}, props: MapToolProperties): Array<MapOperation> {
        return [];
    }

    onCancel({offsetX, offsetY}, props: MapToolProperties): Array<MapOperation> {
        return [
            {op: "clear", layer: "ui"}
        ];
    }
}
