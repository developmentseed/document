/**
 * @fileoverview
 *   Registers request handlers for document module upon inclusion.
 */

var app = require('expresslane').app,
    view = require('expresslane').view,
    document = require('./document'),
    user = require('user'),
    forms = require('forms');

function documentLoader(req, res, next) {
    var ent = new (require('./document')).Document();
    ent.load(req.params[0], function(err, ent) {
        if (!err) {
            var depth = 1;
                var path = req.params[0].split('/');

                ent.db.view('data/byPath', {
                    startkey: [path.length].concat(path),
                    endkey: [path.length + depth].concat(path).concat({}),
                }, function(err, results) {
                    if (!err) {
                        ent.tree = results.reduce(function(result, current) {
                            if ((current.key[0] == path.length) 
                                && (current._id !== req.params[0])) {
                                result.siblings.push(current.value);
                            }
                            if (current.key[0] > path.length) {
                                result.children.push(current.value);
                            }
                            return result;
                        }, {children: [], siblings: []})

                        // not sure if sorting will work atm.

                        /*Object.keys(ent.tree).forEach( function(k) {
                            ent.tree[k].sort(function(a, b) {
                                return (a.weight || 0) - (b.weight || 0);
                            });
                        });*/

                        req.doc = ent;
                    }
                    next();
                });
        }
        else {
            next();
        }
    });
}

app.get('/*', documentLoader, function(req, res, next) {
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


/**
 * Registers a callback for viewing entries.
 */
app.get('/*', function(req, res, next) {
    if (!req.doc) { return next(); }

    res.render(view('content'), {locals: req.doc.render(req)});
});

/**
 * Expose new form.
 */
app.get('/new/*', document.forms.new.load(), function(req, res) {
    req.form.render(req, res);
});

/**
 * Handle submission of new form.
 */
app.post('/new/*', document.forms.new.load(), function(req, res) {
    req.form.process(req, res);
});

/**
 * Expose edit form.
 */
app.get('/edit/*', document.forms.edit.load(), function(req, res) {
    req.form.render(req, res);
});

/**
 * Handle edit form.
 */
app.post('/edit/*', document.forms.edit.load(), function(req, res) {
    req.form.process(req, res);
});

/**
 * Expose delete form.
 */
app.get('/delete/*', document.forms.delete.load(), function(req, res) {
    req.form.render(req, res);
});

/**
 * Handle delete form.
 */
app.post('/delete/*', document.forms.delete.load(), function(req, res) {
    req.form.process(req, res);
});
