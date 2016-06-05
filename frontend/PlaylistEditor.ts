/// <reference path="riot-ts.d.ts" />

@template("/templates/playlist-editor.html")
export default class PlaylistEditor extends Riot.Element
{
    private selectedPlaylistId: number = null;

    getClickPlaylistHandler(playlistId) {
        return (e) => {
            this.selectedPlaylistId =
                this.selectedPlaylistId === playlistId ? null : playlistId;
        };
    }
}
