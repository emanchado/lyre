Lyre
====

This is a web-based storyteller helper program. It allows a narrator
to use images and music to support the storytelling.

The idea is that, for each story, the narrator will prepare a set of
images and audio tracks for it. Then, when telling the story, the
narrator will use a computer and the audience will use another device,
maybe a tablet. As the story progresses, the narrator can play music,
and also choose images that will appear on the audience's
device. There's also special support for maps, which the narrator will
be able to uncover bit by bit and send only the uncovered parts to the
audience.

See http://HardcoreNarrativist.org/lyre/ for more information and
examples.

Running Lyre
------------

Unfortunately you need a server to run Lyre on. You can use your own
computer, but you have to know how to make other devices connect to it
(eg. find out your IP). Worst case scenario, you can use Lyre to play
the music.

To get started, make sure you have [Node](http://nodejs.org) **and**
[ImageMagick](http://imagemagick.org/) installed and then:

1. Run `npm install` to get dependencies.
1. Create `backend/config/local-development.js` (see below).
1. Create the directory `stories` (or modify the path in the
   configuration).
1. Run `npm run compile`.
1. Run `npm run start`.

The contents of `local-development.js` should at least be:

    module.exports = {
        secretPassphrase: "<my secret passphrase>"
    };

Once that is done, you will be able to login to Lyre using the above
passphrase, at:

    http://localhost:3000/


TODO
----

* Allow sharing of text bits? How would that work? Would that be saved
  for the session, so it can be sent again?
* Allow pasting or dropping an image to share right away, without preparation
* Change pen size with control + drag
* Allow narrators to customise the markers per story
* Highlight unsent map bits?
* Maybe add security to the narrator WebSocket interaction
* Find the reordering bug (big deal for playlists!)
* Reorder scenes

Credits
-------
* Initial UI sketches by Henrik Johnsen
* Concept, code, and logo by Esteban Manchado Velázquez
* Compass icon by [jhnri4](https://openclipart.org/detail/87583/compass-symbol)
* [Map marker](http://www.flaticon.com/free-icon/placeholder_149060) by [Madebyoliver](http://www.flaticon.com/authors/madebyoliver)
* Most other icons from flaticon.com

You can assume the good parts of the UI come from the initial
sketches, and the bad parts were introduced by Esteban :-)
