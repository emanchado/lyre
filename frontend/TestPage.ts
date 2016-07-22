/// <reference path="riot-ts.d.ts" />

import MapDiscoverer from "./MapDiscoverer";

@template("/templates/testpage.html")
export default class FileListerApp extends Riot.Element
{
    private mdTool;
    private output: HTMLCanvasElement;
    private fakeSocket;

    constructor() {
        super();

        this.mdTool = this.tags.mapdiscoverer;
        const resultCanvas = this.output;
        this.fakeSocket = {send: function(data) {
            if (typeof data === "string") {
                const headerData = JSON.parse(data);
                [resultCanvas.width, resultCanvas.height] =
                    [headerData.width, headerData.height];
            } else {
                var contentCtx = resultCanvas.getContext("2d"),
                    imageData = new ImageData(new Uint8ClampedArray(data),
                                              resultCanvas.width,
                                              resultCanvas.height);
                contentCtx.putImageData(imageData, 0, 0);
            }
        }};
    }

    loadMap() {
        this.mdTool.loadMap("/stories/1/files/Robert%20Queen%20House%20map.png");
    }
}
