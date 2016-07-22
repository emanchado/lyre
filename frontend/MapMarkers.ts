export interface Marker {
    url: string,
    x: number,
    y: number
}

export class MapMarkerSet {
    private markerList: Array<Marker>;
    private imgElementCache;

    constructor(private canvas: HTMLCanvasElement) {
        this.markerList = [];
        this.imgElementCache = {};
    }

    push(marker: Marker) {
        this.markerList.push(marker);
        if (!(marker.url in this.imgElementCache)) {
            const imgEl = document.createElement("img");
            imgEl.src = marker.url;
            this.imgElementCache[marker.url] = imgEl;
        }
        this.update();
    }

    remove(pointerX: number, pointerY: number): Marker {
        for (let i = 0, len = this.markerList.length; i < len; i++) {
            const marker = this.markerList[i];
            const { x, y } = marker;
            const { width, height } = this.imgElementCache[marker.url];

            if (pointerX >= x && pointerX <= x + width &&
                    pointerY >= y && pointerY <= y + height) {
                const deletedArray = this.markerList.splice(i, 1);
                this.update();
                return deletedArray[0];
            }
        }

        return null;
    }

    private update() {
        const ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.markerList.forEach(marker => {
            ctx.drawImage(this.imgElementCache[marker.url],
                          marker.x,
                          marker.y);
        });
    }
}
