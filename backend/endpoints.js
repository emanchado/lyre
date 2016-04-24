function index(req, res) {
    res.render("index", {
        scenarios: [
            {id: 1, title: "Suffragettes"}
        ]
    });
}

function scenarioView(req, res) {
    res.render("scenario-view", {
        id: 1,
        title: "Suffragettes",
        images: [],
        playlists: [],
        maps: []
    });
}

function scenarioNarrate(req, res) {
    res.render("scenario-narrate", {});
}

export { index, scenarioView, scenarioNarrate };
