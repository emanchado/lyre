import {MapDiscovererTool, MapOperation, MapToolProperties} from "./MapDiscovererTool";
import { Marker } from "./MapMarkers";

export default class MoveMarkerTool implements MapDiscovererTool {
    onStart({offsetX, offsetY}, props: MapToolProperties): Array<MapOperation> {
        return [
            {op: "image",
             layer: "ui",
             center: [offsetX, offsetY],
             src: props.marker.url}
        ];
    }

    onMove({offsetX, offsetY}, props: MapToolProperties): Array<MapOperation> {
        return [
            {op: "clear", layer: "ui"},
            {op: "image",
             layer: "ui",
             center: [offsetX, offsetY],
             src: props.marker.url}
        ];
    }

    onStop({offsetX, offsetY}, props: MapToolProperties): Array<MapOperation> {
        return [
            {op: "clear", layer: "ui"},
            {op: "image",
             layer: "markers",
             center: [offsetX, offsetY],
             src: props.marker.url},
            {op: "clearMarker", layer: "markers"}
        ];
    }

    onCancel({offsetX, offsetY}, props: MapToolProperties): Array<MapOperation> {
        return [
            {op: "clear", layer: "ui"},
            {op: "clearMarker", layer: "markers"}
        ];
    }
}
