import Q from "q";

function statementsToMigrationPromise(db, statements) {
    const promise = Q(true);

    db.serialize();
    statements.forEach(stmt => {
        promise.then(() => {
            Q.ninvoke(db, "exec", stmt);
        });
    });

    return promise;
}

const MIGRATIONS = [
    function createInitialTables(db) {
        const tableCreationStatements = [
            `CREATE TABLE _migrations (id integer primary key,
                                       name text)`,
            `CREATE TABLE stories (id integer primary key,
                                   title text)`,
            `CREATE TABLE scenes (id integer primary key,
                                  story_id integer,
                                  position integer,
                                  title text)`,
            `CREATE TABLE files (id integer primary key,
                                 scene_id integer,
                                 position integer,
                                 original_name text,
                                 path text,
                                 type text)`,
            `CREATE TABLE playlists (id integer primary key,
                                     story_id integer,
                                     position integer,
                                     title text)`,
            `CREATE TABLE tracks (id integer primary key,
                                  playlist_id integer,
                                  position integer,
                                  original_name text,
                                  path text)`
        ];

        return statementsToMigrationPromise(db, tableCreationStatements);
    },

    function createMarkerTables(db) {
        const tableCreationStatements = [
            `CREATE TABLE markers (id integer primary key,
                                   title text,
                                   url text)`,
            `CREATE TABLE story_markers (marker_id integer,
                                         story_id integer,
                                         PRIMARY KEY (marker_id, story_id))`
        ];

        return statementsToMigrationPromise(db, tableCreationStatements);
    }
];

function migrationApplied(db, migrationName) {
    return Q.ninvoke(
        db,
        "get",
        "SELECT COUNT(*) AS cnt FROM _migrations WHERE name = ?",
        migrationName
    ).then(function(row) {
        return row.cnt > 0;
    }).catch(function() {
        return false;
    });
}

function markMigrationApplied(db, migrationName) {
    return Q.ninvoke(
        db,
        "run",
        "INSERT INTO _migrations (name) VALUES (?)",
        migrationName
    );
}

function upgradeDb(db) {
    const migrationPromise = Q(true);

    MIGRATIONS.forEach(migration => {
        migrationPromise.then(() => {
            return migrationApplied(db, migration.name).then(result => {
                if (!result) {
                    return migration(db).then(() =>
                        markMigrationApplied(db, migration.name)
                    );
                }

                return true;
            }).catch(err => {
                console.error("There was some horrible error???", err);
            });
        });
    });

    return migrationPromise;
}

export { upgradeDb };
