/*global ImageData */

function showPictures(pictures) {
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

window.addEventListener("load", function() {
    var content = document.getElementById("content"),
        picture = document.getElementById("picture"),
        pictures = document.getElementById("pictures");

    var socket = new WebSocket("ws://localhost:3000/audience/ws");
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
                } else if (data.type === 'pictures') {
                    picture.style.display = '';
                    pictures.style.display = '';
                    content.style.display = 'none';
                    showPictures(data.pictures);
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
}, false);
