import * as url from "url";

const ROUTES = [
    {regExp: new RegExp("^/narrator/ws/([0-9]+)$"),
     handler: function(ws, matches) {
         dispatchNarratorWs(ws, matches[1]);
     }},
    {regExp: new RegExp("^/audience/ws/([0-9]+)$"),
     handler: function(ws, matches) {
         dispatchAudienceWs(ws, matches[1]);
     }}
];

const webSockets = {narrator: [], audience: []};

function dispatchNarratorWs(ws, storyId) {
    // Maybe some kind of authentication here
    webSockets.narrator[storyId] = webSockets.narrator[storyId] || [];
    webSockets.narrator[storyId].push(ws);

    ws.on("message", function(message) {
        const audienceSockets = webSockets.audience[storyId] || [];

        audienceSockets.forEach(function(socket) {
            if (socket.readyState === 1) {
                socket.send(message);
            }
        });
    });
}

function dispatchAudienceWs(ws, storyId) {
    webSockets.audience[storyId] = webSockets.audience[storyId] || [];
    webSockets.audience[storyId].push(ws);
}

function dispatchWsConnection(ws, url) {
    let handled = false;

    ROUTES.forEach(({regExp, handler}) => {
        const matchResult = url.match(regExp);

        if (matchResult) {
            handler(ws, matchResult);
            handled = true;
        }
    });

    if (!handled) {
        ws.close();
    }
}

function wsConnection(ws) {
    const location = url.parse(ws.upgradeReq.url, true);

    dispatchWsConnection(ws, location.path);
}

export { wsConnection };
