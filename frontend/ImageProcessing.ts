type PixelPredicate = (r: number, g: number, b: number, a: number) => boolean;

type PixelMapper = (r: number, g: number, b: number, a: number) => Array<number>;

/**
 * Given a canvas element, it returns the coordinates of the top-left
 * and bottom-right corners of the smallest rectangle that contains
 * all of the transparent pixels in the given canvas.
 */
export function minimumRectangle(canvas: HTMLCanvasElement, pixelPicker: PixelPredicate): Array<number> {
    var ctx = canvas.getContext("2d"),
    data = ctx.getImageData(0, 0, canvas.width, canvas.height).data,
    coords = [canvas.width - 1, canvas.height - 1, 0, 0];

    for (var j = 0, h = canvas.height; j < h; j++) {
        for (var i = 0, w = canvas.width; i < w; i++) {
            // Each coordinate is four numbers (RGBA)
            const baseIndex = (j * w + i) * 4;
            const interestingPixel = pixelPicker(data[baseIndex],
                                                 data[baseIndex+1],
                                                 data[baseIndex+2],
                                                 data[baseIndex+3]);

            if (interestingPixel) {
                coords[0] = Math.min(coords[0], i);
                coords[1] = Math.min(coords[1], j);
                coords[2] = Math.max(coords[2], i);
                coords[3] = Math.max(coords[3], j);
            }
        }
    }

    if (coords[0] > coords[2] || coords[1] > coords[3]) {
        return [0, 0, 0, 0];
    }
    return coords;
}

export function processImage(inputImageUrl: string, converter: PixelMapper, callback: Function) {
    let tmpCanvas = document.createElement("canvas"),
        tmpImg = document.createElement("img");

    tmpImg.addEventListener("load", function() {
        tmpCanvas.width = this.width;
        tmpCanvas.height = this.height;

        const tmpCanvasCtx = tmpCanvas.getContext("2d");
        tmpCanvasCtx.drawImage(tmpImg, 0, 0);

        const data = tmpCanvasCtx.getImageData(0, 0, this.width, this.height);
        for (let i = 0, len = data.data.length; i < len; i += 4) {
            const px = data.data;
            const newPixel = converter(px[i], px[i+1], px[i+2], px[i+3]);
            [ px[i], px[i+1], px[i+2], px[i+3] ] = newPixel;
        }
        tmpCanvasCtx.putImageData(data, 0, 0);

        callback(null, tmpCanvas.toDataURL("image/png"));
        tmpCanvas = null;
    }, false);
    tmpImg.src = inputImageUrl;
}

export default minimumRectangle;
