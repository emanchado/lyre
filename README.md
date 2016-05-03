Lyre
====
This is a storyteller helper program. It allows a narrator to setup a
set of images and music playlists to use when narrating a story.

To get started, you have to:

1. Run `npm install` to get dependencies
1. Run `npm run watchbe`, wait for it to finish compiling, kill it
1. Run `npm run watchfe`, wait for it to finish compiling, kill it
1. Run `npm run startdev`

Once that is done, open two browser tabs with the following URLs:

1. http://localhost:3000/scenarios/narrate/1
1. http://localhost:3000/scenarios/listen/1

The first one will usually be loaded in the narrator's laptop, and the
second will be loaded in a device shared by the players (eg. a tablet).

In the first URL you can:

* Choose an image: it will automatically be sent to the players'
device.
* Choose a map: you will then be able to uncover certain parts of the
  map, and press "Send to audience" whenever you want them to see the
  uncovered part of the map.
* Choose a playlist: it will start playing (only on the narrator's
  laptop!) all the songs in that playlist, in repeat.

For now, if you want your own images, maps and playlists you will have
to modify the variable `apiResponse` in `frontend/lyre.ts` and compile
the frontend again with `npm run watchfe`. The files will have to be
under `public/catalog`.


TODO
----

* Allow changing the size of pencil?
* Map markers for characters?
* Mark unsent map bits?
* Write the actual backend to upload files, and get that information
  from the backend instead of from the hardcoded `apiResponse`.
