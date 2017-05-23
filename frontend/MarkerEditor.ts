/// <reference path="riot-ts.d.ts" />

@template("/templates/marker-editor.html")
export default class MarkerEditor extends Riot.Element
{
    private storyId: number;
    private currentDraggedItem;
    private onSceneSelect: Function;
    private onSceneDelete: Function;
    private onStoryMarkerSelect: Function;
    private onMarkerSelect: Function;
    private onMarkerUpload: Function;

    constructor() {
        super();

        this.storyId = this.opts.storyid;
        this.onStoryMarkerSelect = this.opts.onstorymarkerselect;
        this.onMarkerSelect = this.opts.onmarkerselect;
        this.onMarkerUpload = this.opts.onmarkerupload;

        this.isSelected = this.isSelected.bind(this);
        this.onStoryMarkerClick = this.onStoryMarkerClick.bind(this);
    }

    storyMarkers() {
        return this.opts.markerpool.filter(marker => (
            this.opts.storymarkerids.indexOf(marker.id) !== -1
        ));
    }

    availableMarkers() {
        return this.opts.markerpool.filter(marker => (
            this.opts.storymarkerids.indexOf(marker.id) === -1
        ));
    }

    isSelected(markerId) {
        const selectedItem = this.opts.selecteditem;

        return (
            ["marker", "storyMarker"].indexOf(selectedItem._type) !== -1 &&
                selectedItem.id === markerId
        );
    }

    onStoryMarkerClick(e) {
        const markerId = parseInt(e.target.parentNode.dataset["id"], 10);

        this.onStoryMarkerSelect(markerId);
    }

    onMarkerClick(e) {
        const markerId = parseInt(e.target.parentNode.dataset["id"], 10);

        this.onMarkerSelect(markerId);
    }

    onAddMarkerClickHandler() {
        this["new-marker"].click();
    }

    onNewMarkerChanged(e) {
        console.log("New file yo");
        if (!e.target.value) {
            return;
        }

        this.onMarkerUpload(e.target.files[0]);
    }
}
