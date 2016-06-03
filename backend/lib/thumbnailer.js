import path from "path";
import { spawn } from "child_process";
import Q from "q";

function makeThumbnail(imagePath) {
    const dirname = path.dirname(imagePath),
          basename = path.basename(imagePath),
          thumbnailPath = path.join(dirname, "thumbnails", basename);

    const deferred = Q.defer();

    try {
        const convertCmd = spawn("convert", [
            "-thumbnail",
            "150x150^",
            "-gravity",
            "center",
            "-extent",
            "150x150",
            imagePath,
            thumbnailPath
        ]);
        convertCmd.on("close", () => {
            deferred.resolve();
        });
    } catch(e) {
        deferred.reject(e.toString());
    }

    return deferred.promise;
}

export default { makeThumbnail };
