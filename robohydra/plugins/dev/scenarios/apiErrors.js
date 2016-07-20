var heads = require("robohydra").heads,
    RoboHydraHeadStatic = heads.RoboHydraHeadStatic;

module.exports.getBodyParts = function() {
    return {
        heads: [
            new RoboHydraHeadStatic({
                path: "/api/.*",
                method: ["PUT", "POST", "DELETE"],
                statusCode: 500,
                content: {
                    success: false,
                    errorMessage: "Fake Internal Server Error for testing"
                }
            })
        ]
    };
};
