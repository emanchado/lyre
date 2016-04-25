/// <reference path="riot-ts.d.ts" />

import FileLister from "./FileLister";
import MapDiscoverer from "./MapDiscoverer";

const files = [
    {title: "Robert Greene",
     url: "/catalog/Robert%20Greene.png",
     type: "image"},
    {title: "Robert Greene photograph",
     url: "/catalog/Robert%20Greene%20photograph.jpg",
     type: "image"},
    {title: "Caves",
     url: "/catalog/kubickas-roots-grid-small.jpg",
     type: "map"},
    {title: "Divide",
     url: "/catalog/kemps-divide-grid-small.jpg",
     type: "map"},
    {title: "Circles of Madness",
     url: "/catalog/froehlichs-circles-of-madness-grid-small.jpg",
     type: "map"}
];

const mappingApp = new MapDiscoverer(document.getElementById("tools"),
                                     document.getElementById("map-container")),
      fileListerApp = new FileLister(document.getElementById("file-list"),
                                     mappingApp,
                                     files);


const playlistApp = riot.mount('playlist-app', {
    playlists: [
        {title: "Intro",
         tracks: [
             {url: "/catalog/audio/Jessica%20Curry%20-%20Dear%20Esther%20-%2008%20Standing%20Stones.mp3",
              title: "Standing Stones"}
         ]},
        {title: "Action",
         tracks: [
             {url: "/catalog/audio/suitor-attacks-preview.mp3",
              title: "Suitor Attacks"},
             {url: "/catalog/audio/Cthulhus_Rising.mp3",
              title: "Cthulhu's Rising"}
         ]},
        {title: "Ritual",
         tracks: [
             {url: "/catalog/audio/Raise_Dead_Ritual.mp3",
              title: "Raise Dead Ritual"}
         ]}
    ]
});
