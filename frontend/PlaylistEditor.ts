/// <reference path="riot-ts.d.ts" />

@template("/templates/tracklist-editor.html")
class TracklistEditor extends Riot.Element
{
    private onTrackUpload: Function;
    private onUnzoom: Function;
    private onTrackSelect: Function;
    private onTrackMoved: Function;
    private currentDraggedItem;

    constructor() {
        super();

        this.onTrackUpload = this.opts.ontrackupload;
        this.onUnzoom = this.opts.onunzoom;
        this.onTrackSelect = this.opts.ontrackselect;
        this.onTrackMoved = this.opts.ontrackmoved;

        this.isTrackSelected = this.isTrackSelected.bind(this);
        this.onTrackClick = this.onTrackClick.bind(this);
        this.onAddNewTrackClick = this.onAddNewTrackClick.bind(this);
        this.onNewTrackChange = this.onNewTrackChange.bind(this);
        this.onDragStart = this.onDragStart.bind(this);
        this.onDragEnd = this.onDragEnd.bind(this);
        this.onDragEnter = this.onDragEnter.bind(this);
    }

    isTrackSelected(trackId) {
        const selectedItem = this.opts.selecteditem;

        return selectedItem._type === "track" && selectedItem.id === trackId;
    }

    onTrackClick(e) {
        const trackId = parseInt(e.target.dataset["id"], 10);

        this.onTrackSelect(trackId);
    }

    onAddNewTrackClick(e) {
        this["new-track"].click();
    }

    onNewTrackChange(e) {
        if (!e.target.value) {
            return;
        }

        const playlistId = parseInt(e.target.dataset["id"], 10);
        this.onTrackUpload(playlistId, e.target.files[0]);
    }

    /**
     * Sometimes we can get Text nodes if we simply get to
     * .previousSibling, hence this method to make sure we get the
     * previous track element.
     */
    private previousTrackEl(fileEl) {
        const previousSibling = fileEl.previousSibling;

        if (!previousSibling) {
            return null;
        }
        if (!(previousSibling instanceof HTMLElement)) {
            return this.previousTrackEl(previousSibling);
        }

        return previousSibling;
    }

    onDragStart(e) {
        this.currentDraggedItem = e.target;
        this.currentDraggedItem.style.opacity = "0.3";
        return true;
    }

    onDragEnd(e) {
        const currentTrackId = this.currentDraggedItem.dataset.id,
              prevTrack = this.previousTrackEl(this.currentDraggedItem),
              prevTrackId = (prevTrack && prevTrack.dataset) ? prevTrack.dataset.id : null;

        this.currentDraggedItem.style.opacity = "";
        this.currentDraggedItem = null;

        this.onTrackMoved(currentTrackId, prevTrackId);
        return true;
    }

    onDragEnter(e) {
        const targetTrack = e.target;

        if (targetTrack !== this.currentDraggedItem) {
            if (this.currentDraggedItem) {
                const parent = this.currentDraggedItem.parentNode;
                parent.insertBefore(this.currentDraggedItem, targetTrack);
            }
        }
        return true;
    }
}

@template("/templates/playlist-editor.html")
export default class PlaylistEditor extends Riot.Element
{
    private selectedPlaylistId: number = null;
    private onPlaylistSelect: Function;
    private onPlaylistCreate: Function;
    private onPlaylistTitleUpdate: Function;

    constructor() {
        super();

        this.onPlaylistSelect = this.opts.onplaylistselect;
        this.onPlaylistCreate = this.opts.onplaylistcreate;
        this.onPlaylistTitleUpdate = this.opts.onplaylisttitleupdate;

        this.onPlaylistClick = this.onPlaylistClick.bind(this);
        this.isPlaylistSelected = this.isPlaylistSelected.bind(this);
    }

    getClickPlaylistHandler(playlistId) {
        return (e) => {
            this.selectedPlaylistId =
                this.selectedPlaylistId === playlistId ? null : playlistId;
        };
    }

    isPlaylistSelected(playlistId: number) {
        const selectedItem = this.opts.selecteditem;

        return selectedItem._type === "playlist" &&
            selectedItem.id === playlistId;
    }

    onPlaylistClick(e) {
        const playlistId = parseInt(e.target.parentNode.dataset["id"], 10);

        this.onPlaylistSelect(playlistId);
    }
}
