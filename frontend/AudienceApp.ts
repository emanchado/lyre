/// <reference path="riot-ts.d.ts" />

import ReconnectingWebSocket from "./ReconnectingWebSocket";

const AUDIENCE_WEBSOCKET_URL = location.protocol.replace("http", "ws") +
    location.host + "/audience/ws";

@template("/templates/audienceview.html")
export default class AudienceApp extends Riot.Element
{
    private socket: ReconnectingWebSocket;
    private mode: string;
    private imageUrl: string;
    private mapcanvas: HTMLCanvasElement;

    constructor() {
        super();

        this.mode = "image";
        this.imageUrl = "/img/av.png";

        // This is a named element, see the template
        const mapCanvas = this.mapcanvas;
        this.socket = new ReconnectingWebSocket(AUDIENCE_WEBSOCKET_URL);
        this.socket.on("open", () => { this.update(); });
        this.socket.on("close", () => { this.update(); });
        this.socket.on("message", (msg) => {
            if (typeof(msg.data) === "string") {
                try {
                    var data = JSON.parse(msg.data);

                    if (data.type === "map-metadata") {
                        this.mode = "map";
                        mapCanvas.width = data.width;
                        mapCanvas.height = data.height;
                    } else if (data.type === "pictures") {
                        this.mode = "image";
                        this.imageUrl = data.pictures[0].thumbnailUrl;
                    }

                    this.update();
                } catch(e) {
                    console.warn("dafuq did I just read?", msg.data);
                    console.error(e);
                }
            } else if (typeof(msg.data) === "object") {
                var contentCtx = mapCanvas.getContext("2d"),
                imageData = new ImageData(new Uint8ClampedArray(msg.data),
                                          mapCanvas.width,
                                          mapCanvas.height);
                contentCtx.putImageData(imageData, 0, 0);
            }
        });
    }

    isOnline(): boolean {
        return this.socket.isOnline;
    }

    inImageMode() {
        return this.mode === "image";
    }

    inMapMode() {
        return this.mode === "map";
    }
}
