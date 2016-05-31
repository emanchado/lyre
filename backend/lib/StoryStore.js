import path from "path";
import fse from "fs-extra";
import sqlite3 from "sqlite3";
import { upgradeDb } from "./StoryStoreMigrations";
import Q from "q";

class StoryStore {
    constructor(dbPath, storyDir) {
        this.dbPath = dbPath;
        this.storyDir = storyDir;
    }

    connect() {
        this.db = new sqlite3.Database(this.dbPath);
        return upgradeDb(this.db);
    }

    listStories() {
        Q.ninvoke(
            this.db,
            "all",
            `SELECT stories.id, stories.name, COUNT(scenes.story_id) AS cnt
               FROM stories LEFT JOIN scenes
                 ON stories.id = scenes.story_id
           GROUP BY stories.name`
        ).then(function(rows) {
            return rows.map(row => {
                return {
                    id: storyInfo.id,
                    title: storyInfo.title,
                    numberScenes: storyInfo.scenes.length,
                    numberPlaylists: storyInfo.playlists.length
                };
            });
        });

        // return fse.readdirSync(this.storePath).map(storyId => {
        //     const infoJsonPath =
        //               path.join(this.storePath, storyId, "info.json"),
        //           storyInfo =
        //               JSON.parse(fse.readFileSync(infoJsonPath).toString());

        //     return {id: storyInfo.id,
        //             title: storyInfo.title,
        //             numberScenes: storyInfo.scenes.length,
        //             numberPlaylists: storyInfo.playlists.length};
        // });
    }

    getStory(storyId) {
        db.serialize();
        return db.run("SELECT * FROM stories WHERE id = ?", storyId);
    }

    saveStory(story) {
        const storyDir = path.join(this.storePath, story.id.toString());

        fse.mkdirs(storyDir);
        fse.writeFileSync(path.join(storyDir, "info.json"),
                          JSON.stringify(story));
    }

    reorderImage(storyId, imageId, newPreviousId) {
        const story = this.getStory(storyId);

        story.scenes.forEach(function(scene) {
            let fileIndex = null,
                previousIndex = newPreviousId ? null : -1;
            scene.files.forEach(function(file, i) {
                if (file.id === imageId) {
                    console.log("Found fileIndex");
                    fileIndex = i;
                } else if (file.id === newPreviousId) {
                    console.log("Found previousIndex");
                    previousIndex = i - (fileIndex ? 1 : 0);
                }
            });

            if (fileIndex !== null && previousIndex !== null) {
                console.log("Moved file");
                const movedFile = scene.files.splice(fileIndex, 1)[0];
                scene.files.splice(previousIndex + 1, 0, movedFile);
            }
        });

        this.saveStory(story);
    }
}

export default StoryStore;
