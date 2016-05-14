/*global ImageData */

var currentDocumentWidth  = document.body.clientWidth,
    currentDocumentHeight = document.body.clientHeight;

function showPicture(picture) {
    var container = document.getElementById("picture"),
        imgEl = container.querySelector("img");

    imgEl.src = picture.originalUrl;
    imgEl.style.maxHeight = currentDocumentHeight + "px";
    imgEl.style.maxWidth = currentDocumentWidth + "px";
}

function showGallery(pictures) {
    var gallery = document.getElementById("pictures"),
        galleryLinks = gallery.getElementsByTagName("a");

    for (var i = 0, len = galleryLinks.length; i < len; i++) {
        gallery.removeChild(galleryLinks[i]);
    }

    pictures.forEach(function(picture) {
        var newLink = document.createElement("a"),
            newImage = document.createElement("img");

        newLink.href = picture.originalUrl;
        newLink.dataset.lightbox = "characters";

        newImage.src = picture.thumbnailUrl;

        newLink.appendChild(newImage);
        gallery.appendChild(newLink);
    });
}

function inFullscreenMode() {
    return [
        "fullScreenElement",
        "mozFullScreenElement"
    ].some(function(attribute) {
        return document[attribute];
    });
}

function enterFullscreenMode(element) {
    ["requestFullscreen",
     "mozRequestFullscreen",
     "msRequestFullscreen",
     "webkitRequestFullscreen"].forEach(function(method) {
         if (element[method]) {
             element[method]();
             return false;
         }
         return true;
     });
}

function exitFullscreenMode() {
    ["exitFullscreen",
     "mozCancelFullScreen",
     "msExitFullscreen",
     "webkitExitFullscreen"].forEach(function(method) {
         if (document[method]) {
             document[method]();
             return false;
         }
         return true;
     });
}

window.addEventListener("load", function() {
    var content = document.getElementById("content"),
        picture = document.getElementById("picture"),
        pictures = document.getElementById("pictures");

    document.getElementById("fullscreen-btn").addEventListener("click", function() {
        var element = document.body;

        if (inFullscreenMode()) {
            exitFullscreenMode(element);
        } else {
            enterFullscreenMode(element);
        }
    }, false);

    var wsUrl = location.protocol.replace("http", "ws") +
            location.host + "/audience/ws",
        socket = new WebSocket(wsUrl);
    socket.binaryType = "arraybuffer";

    socket.onerror = function() {
        console.log("Could not establish a WebSocket connection");
    };
    socket.onmessage = function(msg) {
        if (typeof(msg.data) === 'string') {
            try {
                var data = JSON.parse(msg.data);

                if (data.type === 'map-metadata') {
                    picture.style.display = 'none';
                    pictures.style.display = 'none';
                    content.style.display = '';
                    content.width = data.width;
                    content.height = data.height;
                    content.style.maxHeight = currentDocumentHeight + "px";
                    content.style.maxWidth = currentDocumentWidth + "px";
                } else if (data.type === 'pictures') {
                    content.style.display = 'none';
                    if (data.pictures.length > 1) {
                        picture.style.display = 'none';
                        pictures.style.display = '';
                        showGallery(data.pictures);
                    } else {
                        picture.style.display = '';
                        pictures.style.display = 'none';
                        showPicture(data.pictures[0]);
                    }
                }
            } catch(e) {
                console.warn("dafuq did I just read?", msg.data);
                console.error(e);
            }
        } else if (typeof(msg.data) === 'object') {
            var contentCtx = content.getContext("2d"),
                imageData = new ImageData(new Uint8ClampedArray(msg.data),
                                          content.width,
                                          content.height);
            contentCtx.putImageData(imageData, 0, 0);
        }
    };

    document.addEventListener("resize", function(/*evt*/) {
        currentDocumentHeight = document.body.clientHeight;
    }, false);
}, false);
