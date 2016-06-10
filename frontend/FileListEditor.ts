/// <reference path="riot-ts.d.ts" />

@template("/templates/filelist-editor.html")
export default class FileListerEditor extends Riot.Element
{
    private storyId: number;
    private scenes;
    private currentDraggedItem;
    private onSceneSelect: Function;
    private onSceneTitleUpdate: Function;
    private onSceneDelete: Function;
    private onFileSelect: Function;
    private onFileMoved: Function;
    private onFileUpload: Function;

    constructor() {
        super();

        this.storyId = this.opts.storyid;
        this.scenes = this.opts.scenes;
        this.onSceneSelect = this.opts.onsceneselect;
        this.onSceneTitleUpdate = this.opts.onscenetitleupdate;
        this.onSceneDelete = this.opts.onscenedelete;
        this.onFileSelect = this.opts.onfileselect;
        this.onFileMoved = this.opts.onfilemoved;
        this.onFileUpload = this.opts.onfileupload;

        this.isSelected = this.isSelected.bind(this);
        this.onFileClick = this.onFileClick.bind(this);
    }

    isSelected(fileId) {
        const selectedItem = this.opts.selecteditem;

        return selectedItem._type === "file" && selectedItem.id === fileId;
    }

    onFileClick(e) {
        const fileId = parseInt(e.target.parentNode.dataset["id"], 10);

        this.onFileSelect(fileId);
    }

    onAddImageClickHandler(sceneId) {
        return e => {
            this["newfile-" + sceneId].click();
        };
    }

    onNewFileChanged(e) {
        if (!e.target.value) {
            return;
        }

        const sceneId = parseInt(e.target.dataset["sceneId"], 10);
        this.onFileUpload(sceneId, e.target.files[0]);
    }

    /**
     * Sometimes we can get Text nodes if we simply get to
     * .previousSibling, hence this method to make sure we get the
     * previous image element.
     */
    private previousFileEl(fileEl) {
        const previousSibling = fileEl.previousSibling;

        if (!previousSibling) {
            return null;
        }
        if (!(previousSibling instanceof HTMLElement)) {
            return this.previousFileEl(previousSibling);
        }

        return previousSibling;
    }

    onDragStart(ev) {
        this.currentDraggedItem = ev.target.parentNode;
        this.currentDraggedItem.style.opacity = "0.3";
        return true;
    }

    onDragEnd(ev) {
        const currentImageId = this.currentDraggedItem.dataset.id,
              prevImage = this.previousFileEl(this.currentDraggedItem),
              prevImageId = (prevImage && prevImage.dataset) ? prevImage.dataset.id : null;

        this.currentDraggedItem.style.opacity = "";
        this.currentDraggedItem = null;

        this.onFileMoved(currentImageId, prevImageId);
        return true;
    }

    onDragEnter(ev) {
        const targetLi = ev.target.parentNode;

        if (targetLi !== this.currentDraggedItem) {
            if (this.currentDraggedItem) {
                const parent = this.currentDraggedItem.parentNode;
                parent.insertBefore(this.currentDraggedItem, targetLi);
            }
        }
        return true;
    }
}
