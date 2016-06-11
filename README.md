Lyre
====

This is a web-based storyteller helper program. It allows a narrator
to use images and music to support the storytelling.

The idea is that the narrator will use a computer and the audience
will use another device, maybe a tablet. Then, the narrator can play
music, and also choose images that will appear on the audience's
device. There's also special support for maps, which the narrator will
be able to uncover bit by bit and send only the uncovered parts to the
audience.

Running Lyre
------------

To get started, you have to:

1. Run `npm install` to get dependencies.
1. Create `backend/config/local-development.js` (see below).
1. Create the directory `stories` (or modify the path in the
   configuration).
1. Run `npm run compile`.
1. Run `npm run start`.

The contents of `local-development.js` have to be:

    module.exports = {
        secretPassphrase: "<my secret passphrase>"
    };

Once that is done, you will have Lyre available at:

    http://localhost:3000/


TODO
----

* Add logo for the initial listen

* Remove code for galleries, jQuery, etc.
* Catch API response errors in the frontend, esp. when trying to upload new stuff (check right types, too?)
* Reorder scenes
* Map markers for characters?
* Mark unsent map bits?

Credits
-------
* Initial UI sketches by Henrik Johnsen
* Concept, code, and logo by Esteban Manchado Velázquez
* Compass icon by [jhnri4](https://openclipart.org/detail/87583/compass-symbol)
* Most other icons from flaticon.com

You can assume the good parts of the UI come from the initial
sketches, and the bad parts were introduced by Esteban :-)
