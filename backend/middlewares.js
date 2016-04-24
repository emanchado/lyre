function getAuthMiddleware(configuration) {
    return function(req, res, next) {
        if (req.session.authenticated === true) {
            next();
        } else {
            if (req.body && req.body.passphrase === configuration.secretPassphrase) {
                req.session.authenticated = true;
                next();
            } else {
                res.render('login', {layout: false});
            }
        }
    };
}

export { getAuthMiddleware };
