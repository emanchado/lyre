/// <reference path="riot-ts.d.ts" />

@template("/templates/sceneheader.html")
class SceneHeader extends Riot.Element {
    private sceneId: number;

    constructor() {
        super();

        this.sceneId = this.opts.id;
        this.onSceneClick = this.onSceneClick.bind(this);
    }

    isSelected() {
        return this.opts.selecteditem._type === "scene" &&
            this.opts.selecteditem.id === this.opts.id;
    }

    onSceneClick(e) {
        const onSceneSelect = this.opts.onsceneselect || function() {};

        onSceneSelect(this.sceneId);
    }
}
