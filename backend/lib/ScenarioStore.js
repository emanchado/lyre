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
                    name: scenarioInfo.name,
                    numberImages: scenarioInfo.files.length,
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
}

export default ScenarioStore;
