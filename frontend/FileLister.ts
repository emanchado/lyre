/// <reference path="riot-ts.d.ts" />

import MapDiscoverer from "./MapDiscoverer";

const WEBSOCKET_URL = location.protocol.replace("http", "ws") +
            location.host + "/narrator/ws";

const enum FileListerAppModes { FileList, Map };

@template("/templates/sceneheader.html")
class SceneHeader extends Riot.Element {}

@template("/templates/filelister.html")
export default class FileListerApp extends Riot.Element
{
    private files;
    private socket: WebSocket;
    private mode: FileListerAppModes;
    private mappingApp;

    constructor() {
        super();

        this.files = this.opts.files;

        this.mappingApp = this.tags.mapdiscoverer;
        this.mode = FileListerAppModes.FileList;

        this.socket = new WebSocket(WEBSOCKET_URL);
        this.socket.binaryType = "arraybuffer";
        this.socket.onmessage = (message) => {
            console.log("Received", message.data);
        };
        this.socket.onclose = () => {
            this.socket = null;
            setTimeout(() => {
                this.socket = new WebSocket(WEBSOCKET_URL);
                this.socket.binaryType = "arraybuffer";
            }, 5000);
        };
    }

    switchToFileListMode() {
        this.mode = FileListerAppModes.FileList;
    }

    fileListMode() {
        return this.mode === FileListerAppModes.FileList;
    }

    mapMode() {
        return this.mode === FileListerAppModes.Map;
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
            return function(e) {
                this.mode = FileListerAppModes.Map;
                this.mappingApp.loadMap(imageProps.url);
            }.bind(this.parent);
        }
    }
}
