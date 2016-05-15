/// <reference path="riot-ts.d.ts" />

interface PlaylistAudioElements {
    [playlistName: string]: Array<HTMLAudioElement>;
}

@template("/templates/playlist.html")
export default class PlaylistApp extends Riot.Element
{
    private currentPlaylistTitle: string;
    private currentTrackIndex: number;
    private audioElementsForPlaylist: PlaylistAudioElements;
    private container: Element;

    mounted() {
        const playlists = this.root.querySelectorAll("div.playlist");

        // Have to do this because querySelectorAll returns a
        // NodeElementList, not an array
        this.audioElementsForPlaylist = {};
        for (var i = 0, len = playlists.length; i < len; i++) {
            let tracks = playlists[i].querySelectorAll("audio"),
                playlistTitle = playlists[i]["dataset"]["title"];

            this.audioElementsForPlaylist[playlistTitle] = [];
            for (var j = 0, len2 = tracks.length; j < len2; j++) {
                const audioEl = tracks[j] as HTMLAudioElement;
                this.audioElementsForPlaylist[playlistTitle].push(audioEl);
            }
        }
    }

    trackInfo(playlistTitle: string) {
        if (this.currentPlaylistTitle === playlistTitle) {
            const currentAudioEl =
                this.getAudioElement(this.currentPlaylistTitle,
                                     this.currentTrackIndex);
            return currentAudioEl.title;
        } else {
            return "";
        }
    }

    playlistStatus(playlistTitle: string): string {
        const isCurrentPlaylist =
            (this.currentPlaylistTitle === playlistTitle);
        const currentAudioEl = this.getAudioElement(this.currentPlaylistTitle,
                                                    this.currentTrackIndex);

        return isCurrentPlaylist && currentAudioEl && !currentAudioEl.paused ?
            "pause" : "play";
    }

    playPauseHandler(playlistTitle: string) {
        return function(e) {
            if (this.currentPlaylistTitle === playlistTitle) {
                const currentTrackEl = this.getAudioElement(
                    this.currentPlaylistTitle,
                    this.currentTrackIndex
                );

                if (currentTrackEl.paused) {
                    currentTrackEl.play();
                } else {
                    currentTrackEl.pause();
                }
            } else {
                this.playTrack(playlistTitle, 0);
            }
        }.bind(this.parent);
    }

    playTrackHandler(playlistTitle: string, trackIndex: number) {
        return function(e) {
            console.log("Starting track", trackIndex, "in", playlistTitle);
            this.playTrack(playlistTitle, trackIndex);
        }.bind(this.parent);
    }

    endedHandler(playlistTitle: string, trackIndex: number) {
        return function(e) {
            const playlistTracks = this.audioElementsForPlaylist[playlistTitle];
            this.playTrack(playlistTitle,
                           (trackIndex + 1) % playlistTracks.length);
        }.bind(this.parent.parent);
    }

    playTrack(playlistTitle: string, trackIndex: number) {
        const currentTrackEl = this.getAudioElement(this.currentPlaylistTitle,
                                                    this.currentTrackIndex),
              newCurrentTrackEl = this.getAudioElement(playlistTitle,
                                                       trackIndex);
        if (currentTrackEl) {
            currentTrackEl.pause();
            currentTrackEl.currentTime = 0;
            this.currentPlaylistTitle = this.currentTrackIndex = null;
        }

        if (newCurrentTrackEl) {
            newCurrentTrackEl.play();
            this.currentPlaylistTitle = playlistTitle;
            this.currentTrackIndex = trackIndex;
        } else {
            console.warn("Cannot find track", trackIndex, "in playlist", playlistTitle);
        }

        this.update();
    }

    getAudioElement(playlistTitle: string, trackIndex: number): HTMLAudioElement {
        if (!playlistTitle) {
            return null;
        }

        const tracks = this.audioElementsForPlaylist[playlistTitle];
        return tracks[trackIndex] as HTMLAudioElement;
    }
}
