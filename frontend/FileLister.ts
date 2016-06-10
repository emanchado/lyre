/// <reference path="riot-ts.d.ts" />

import MapDiscoverer from "./MapDiscoverer";
import ReconnectingWebSocket from "./ReconnectingWebSocket";

const WEBSOCKET_URL = location.protocol.replace("http", "ws") +
            location.host + "/narrator/ws";

type FileListerAppModes = "filelist" | "map";

@template("/templates/filelister.html")
export default class FileListerApp extends Riot.Element
{
    private scenes;
    private socket: ReconnectingWebSocket;
    private mode: FileListerAppModes;
    private mappingApp;

    constructor() {
        super();

        this.scenes = this.opts.scenes;

        this.mappingApp = this.tags.mapdiscoverer;
        this.mode = "filelist";

        this.socket = new ReconnectingWebSocket(WEBSOCKET_URL);
        this.socket.on("open", () => { this.update(); });
        this.socket.on("close", () => { this.update(); });

        this.switchToFileListMode = this.switchToFileListMode.bind(this);
        this.onImageClickHandler = this.onImageClickHandler.bind(this);
    }

    isOnline(): boolean {
        return this.socket.isOnline;
    }

    switchToFileListMode() {
        this.mode = "filelist";
        this.update();
    }

    fileListMode() {
        return this.mode === "filelist";
    }

    mapMode() {
        return this.mode === "map";
    }

    onImageClickHandler(imageProps) {
        if (imageProps.type === "image") {
            return (e) => {
                this.socket.send(JSON.stringify({
                    type: "pictures",
                    pictures: [{originalUrl: imageProps.url,
                                thumbnailUrl: imageProps.thumbnailUrl}]
                }));
            };
        } else {
            return e => {
                this.mode = "map";
                this.mappingApp.loadMap(imageProps.url);
            };
        }
    }
}
