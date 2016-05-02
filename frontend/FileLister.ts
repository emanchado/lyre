/// <reference path="riot-ts.d.ts" />

const WEBSOCKET_URL = "ws://localhost:3000/narrator/ws";

const enum FileListerAppModes { FileList, Map };

@template("/templates/filelister.html")
class FileListerApp extends Riot.Element
{
    private images;
    private maps;
    private socket: WebSocket;
    private mode: FileListerAppModes;
    private mappingApp;

    constructor() {
        super();

        this.images = this.opts.files.filter((file) => {
            return file.type === "image";
        });
        this.maps = this.opts.files.filter((file) => {
            return file.type === "map";
        });

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

    sendImageHandler(imageProps) {
        return (e) => {
            this.socket.send(JSON.stringify({
                type: "pictures",
                pictures: [{originalUrl: imageProps.url,
                            thumbnailUrl: imageProps.url}]
            }));
        };
    }

    openMapHandler(mapProps) {
        return function(e) {
            this.mode = FileListerAppModes.Map;
            this.mappingApp.loadMap(mapProps.url);
        }.bind(this.parent);
    }
}
