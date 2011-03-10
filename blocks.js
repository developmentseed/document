var app = require('expresslane').app,
    document = require('document');


app.get('/*', document.documentLoader, function(req, res, next) {
    if (!req.doc) { next(); }
     
    req.on('blocks:right', function(blocks) {
        blocks.push({
            module: module.id,
            delta: 'document-menu',
            weight: 5,
            content: function() {
                var locals = {};
                locals._template = 'docnav.jade';
                locals.doc = req.doc;
                return locals;
            }
        });
    })

    next();
});

