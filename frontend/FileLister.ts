/// <reference path="riot-ts.d.ts" />

import MapDiscoverer from "./MapDiscoverer";
import ReconnectingWebSocket from "./ReconnectingWebSocket";

const WEBSOCKET_URL = location.protocol.replace("http", "ws") +
            location.host + "/narrator/ws";

type FileListerAppModes = "filelist" | "map";

@template("/templates/filelister.html")
export default class FileListerApp extends Riot.Element
{
    private storyId: number;
    private scenes: Array<any>;
    private storyMarkers: Array<number>;
    private markerPool: Array<any>;
    private socket: ReconnectingWebSocket;
    private mode: FileListerAppModes;
    private randomImageUrl: string;
    private mappingApp;

    constructor() {
        super();

        this.storyId = this.opts.storyid;
        this.scenes = this.opts.scenes;
        this.storyMarkers = this.opts.storymarkers;
        this.markerPool = this.opts.markerpool;

        this.mappingApp = this.tags.mapdiscoverer;
        this.mode = "filelist";
        this.randomImageUrl = "";

        const wsUrl = WEBSOCKET_URL + "/" + this.storyId;
        this.socket = new ReconnectingWebSocket(wsUrl);
        this.socket.on("open", () => { this.update(); });
        this.socket.on("close", () => { this.update(); });

        this.switchToFileListMode = this.switchToFileListMode.bind(this);
        this.onImageClickHandler = this.onImageClickHandler.bind(this);
        this.onRandomImageUrlUpdate = this.onRandomImageUrlUpdate.bind(this);
        this.onRandomImageSend = this.onRandomImageSend.bind(this);
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

    onRandomImageUrlUpdate(e) {
        this.randomImageUrl = e.target.value;
    }

    onRandomImageSend() {
        this.socket.send(JSON.stringify({
            type: "pictures",
            pictures: [{originalUrl: this.randomImageUrl,
                        thumbnailUrl: this.randomImageUrl}]
        }));
    }
}
