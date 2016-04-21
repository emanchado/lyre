import MapDiscoverer from "./MapDiscoverer";

window.addEventListener("load", () => {
    let app = new MapDiscoverer(document.getElementById("orig-map") as HTMLImageElement,
                                document.getElementById("tools"),
                                document.getElementById("overlay") as HTMLCanvasElement,
                                document.getElementById("ui-hints") as HTMLCanvasElement);

    document.getElementById("new-map-file").addEventListener("change", evt => {
        let file = evt.target["files"][0];
        let reader = new FileReader();
        reader.onload = evt => {
            app.loadImage(evt.target["result"]);
        };
        reader.readAsDataURL(file);
    }, false);
}, false);
