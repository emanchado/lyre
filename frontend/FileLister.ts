import MapDiscoverer from "./MapDiscoverer";

const WEBSOCKET_URL = "ws://localhost:3000/narrator/ws";

export default class FileLister {
    private imageListContainer: HTMLDivElement;
    private mapListContainer: HTMLDivElement;
    private socket: WebSocket;

    constructor(private container: HTMLElement, private mappingApp: MapDiscoverer, files) {
        this.imageListContainer = document.createElement("div");
        this.mapListContainer = document.createElement("div");

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

        files.forEach((fileInfo) => {
            if (fileInfo.type === "image") {
                const fileEl = document.createElement("li");
                fileEl.textContent = fileInfo.title;
                fileEl.onclick = () => {
                    this.socket.send(JSON.stringify({
                        type: "pictures",
                        pictures: [{originalUrl: fileInfo.url,
                                    thumbnailUrl: fileInfo.url}]
                    }));
                };
                this.imageListContainer.appendChild(fileEl);
            } else {
                const fileEl = document.createElement("li");
                fileEl.textContent = fileInfo.title;
                fileEl.onclick = () => {
                    this.mappingApp.loadMap(fileInfo.url);
                };
                this.mapListContainer.appendChild(fileEl);
            }
        });

        const imagesTitle = document.createElement("h1"),
              mapsTitle = document.createElement("h1"),
              imagesList = document.createElement("ul"),
              mapsList = document.createElement("ul");
        imagesTitle.textContent = "Images";
        mapsTitle.textContent = "Maps";

        container.appendChild(imagesTitle);
        imagesList.appendChild(this.imageListContainer);
        container.appendChild(imagesList);
        container.appendChild(mapsTitle);
        mapsList.appendChild(this.mapListContainer);
        container.appendChild(mapsList);
    }
}
