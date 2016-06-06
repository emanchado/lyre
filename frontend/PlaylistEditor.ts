/// <reference path="riot-ts.d.ts" />

type Mode = "view" | "edit";

const ENTER_KEY = 13;
const ESC_KEY = 27;

@template("/templates/editable-playlist.html")
class EditablePlaylist extends Riot.Element
{
    private title: string;
    private mode: Mode;
    private titleBeforeEdits: string;

    constructor() {
        super();

        this.title = this.opts.title;
        this.mode = "view";

        this.inEditMode = this.inEditMode.bind(this);
        this.switchEditMode = this.switchEditMode.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
    }

    inEditMode() {
        return this.mode === "edit";
    }

    switchViewMode() {
        this.mode = "view";
    }

    switchEditMode() {
        this.titleBeforeEdits = this.title;
        this.mode = "edit";
        this.update(); // Need to update so that the input field exists
        this["inputfield"].focus();
    }

    onKeyDown(e) {
        switch (e.which) {
        case ESC_KEY:
            this.title = this.titleBeforeEdits;
            this.switchViewMode();
            this.update();
            break;

        case ENTER_KEY:
            this.title = e.target.value;
            this.update();
            this.switchViewMode();
            this.opts.ontitleupdate(this.opts.id, e.target.value);
            break;

        default:
            this.title = e.target.value;
            return true;
        }
    }
}

@template("/templates/playlist-editor.html")
export default class PlaylistEditor extends Riot.Element
{
    private selectedPlaylistId: number = null;
    private onPlaylistCreate: Function;
    private onPlaylistTitleUpdate: Function;

    constructor() {
        super();

        this.onPlaylistCreate = this.opts.onplaylistcreate;
        this.onPlaylistTitleUpdate = this.opts.onplaylisttitleupdate;
        this.isPlaylistSelected = this.isPlaylistSelected.bind(this);
    }

    getClickPlaylistHandler(playlistId) {
        return (e) => {
            this.selectedPlaylistId =
                this.selectedPlaylistId === playlistId ? null : playlistId;
        };
    }

    isPlaylistSelected(playlistId: number) {
        return false;
    }
}
