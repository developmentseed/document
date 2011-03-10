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
        if (err) { return next(); }

        req.doc = ent;
        ent.tree = {children: [], siblings: []}

        ent.db.view('pages/hierarchy', {
            key: ent.data._id,
        }, function(err, results) {
            if (err) { return next() }

            ent.tree.children = results.reduce(function(result, current) {
                current.value && result.push(current.value);
                return result;
            }, []);


            var parent = ent.data.field_parent || null

            if (!parent) { return next(); }

            ent.db.view('pages/hierarchy', {
                key: parent,
            }, function(err, results) {
                if (err) { return next() }

                ent.tree.siblings = results.reduce(function(result, current) {
                    current.value && result.push(current.value);
                    return result;
                }, []);

                req.doc = ent;
                next();
            });
        });
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
