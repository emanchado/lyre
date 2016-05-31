import path from "path";

module.exports = {
    port: 3000,
    secretPassphrase: null,
    sessionSecret: "This is not a good-enough secret, please change!",
    storyStore: {
        dbPath: path.join(__dirname, "../../lyre.db"),
        path: path.join(__dirname, "../../stories/")
    }
};
