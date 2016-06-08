/// <reference path="riot-ts.d.ts" />

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
