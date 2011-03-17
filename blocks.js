var el = require('expresslane'),
    document = require('document');

    el.addBlock({
        region: 'right',
        loaders: [ document.documentLoader ],
        filter: function(req, res) {
            return !!req.doc;
        },
        content: function(req, res) {
            return {
                _template: 'docnav.jade',
                doc: req.doc,
            }
        },
});

