import path from "path";
import fse from "fs-extra";

class ScenarioStore {
    constructor(storePath) {
        this.storePath = storePath;
        fse.mkdirs(this.storePath);
    }

    listScenarios() {
        return fse.readdirSync(this.storePath).map(scenarioId => {
            const infoJsonPath =
                      path.join(this.storePath, scenarioId, "info.json"),
                  scenarioInfo =
                      JSON.parse(fse.readFileSync(infoJsonPath).toString());

            return {id: scenarioInfo.id,
                    title: scenarioInfo.title,
                    numberScenes: scenarioInfo.scenes.length,
                    numberPlaylists: scenarioInfo.playlists.length};
        });
    }

    getScenario(scenarioId) {
        const scenarioInfoPath = path.join(this.storePath,
                                           scenarioId.toString(),
                                           "info.json");
        return JSON.parse(fse.readFileSync(scenarioInfoPath).toString());
    }

    saveScenario(scenario) {
        const scenarioDir = path.join(this.storePath, scenario.id.toString());

        fse.mkdirs(scenarioDir);
        fse.writeFileSync(path.join(scenarioDir, "info.json"),
                          JSON.stringify(scenario));
    }

    reorderImage(scenarioId, imageId, newPreviousId) {
        const scenario = this.getScenario(scenarioId);

        scenario.scenes.forEach(function(scene) {
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

        this.saveScenario(scenario);
    }
}

export default ScenarioStore;
