import Q from "q";

const MIGRATIONS = [
    function createInitialTables(db) {
        const tableCreationStatements = [
            `CREATE TABLE _migrations (id integer primary key,
                                       name text)`,
            `CREATE TABLE stories (id integer primary key,
                                   name text)`,
            `CREATE TABLE scenes (id integer primary key,
                                  story_id integer,
                                  position integer,
                                  name text)`,
            `CREATE TABLE files (id integer primary key,
                                 scene_id integer,
                                 position integer,
                                 filename text,
                                 type text)`,
            `CREATE TABLE playlists (id integer primary key,
                                     story_id integer,
                                     position integer,
                                     name text)`,
            `CREATE TABLE tracks (id integer primary key,
                                  playlist_id integer,
                                  position integer,
                                  filename text)`
        ];
        const promise = Q(true);

        db.serialize();
        tableCreationStatements.forEach(stmt => {
            promise.then(() => {
                Q.ninvoke(db, "exec", stmt);
            });
        });

        return promise;
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
                console.log("There was some horrible error???");
            });
        });
    });

    return migrationPromise;
}

export { upgradeDb };
