import MapDiscoverer from "./MapDiscoverer";

let app = new MapDiscoverer(document.getElementById("tools"),
                            document.getElementById("map-container"));

document.getElementById("new-map-file").addEventListener("change", evt => {
    let file = evt.target["files"][0];
    let reader = new FileReader();
    reader.onload = evt => {
        app.loadMap(evt.target["result"]);
    };
    reader.readAsDataURL(file);
}, false);

app.loadMap("/img/default-map.png");
