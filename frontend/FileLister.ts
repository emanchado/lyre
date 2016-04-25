import MapDiscoverer from "./MapDiscoverer";

const WEBSOCKET_URL = "ws://localhost:3000/narrator/ws";

export default class FileLister {
    private imageContainer: HTMLDivElement;
    private mapContainer: HTMLDivElement;
    private socket: WebSocket;

    constructor(private container: HTMLElement, private mappingApp: MapDiscoverer, files) {
        this.imageContainer = document.createElement("div");
        this.mapContainer = document.createElement("div");
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
                    console.log("Clicked on image", fileInfo.title);
                    this.socket.send(JSON.stringify({
                        type: "pictures",
                        pictures: [{originalUrl: fileInfo.url,
                                    thumbnailUrl: fileInfo.url}]
                    }));
                };
                this.imageContainer.appendChild(fileEl);
            } else {
                const fileEl = document.createElement("li");
                fileEl.textContent = fileInfo.title;
                fileEl.onclick = () => {
                    this.mappingApp.loadMap(fileInfo.url);
                    console.log("Clicked on map", fileInfo.title);
                };
                this.mapContainer.appendChild(fileEl);
            }
        });

        const imagesTitle = document.createElement("h1"),
              mapsTitle = document.createElement("h1"),
              imagesList = document.createElement("ul"),
              mapsList = document.createElement("ul");
        imagesTitle.textContent = "Images";
        mapsTitle.textContent = "Maps";

        container.appendChild(imagesTitle);
        imagesList.appendChild(this.imageContainer);
        container.appendChild(imagesList);
        container.appendChild(mapsTitle);
        mapsList.appendChild(this.mapContainer);
        container.appendChild(mapsList);
    }
}
