var heads = require("robohydra").heads,
    RoboHydraHeadProxy = heads.RoboHydraHeadProxy;

module.exports.getBodyParts = function() {
    return {
        heads: [
            new RoboHydraHeadProxy({
                mountPath: '/',
                proxyTo: 'http://localhost:3000'
            })
        ]
    };
};
