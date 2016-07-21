/// <reference path="riot-ts.d.ts" />

import MapDiscoverer from "./MapDiscoverer";

@template("/templates/testpage.html")
export default class FileListerApp extends Riot.Element
{
    private mdTool;

    constructor() {
        super();

        this.mdTool = this.tags.mapdiscoverer;
    }

    loadMap() {
        this.mdTool.loadMap("/stories/1/files/Character%20relationships%20map.png");
    }
}
