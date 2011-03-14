/**
 * @fileoverview
 *   Registers request handlers for document module upon inclusion.
 */

var app = require('expresslane').app,
    view = require('expresslane').view,
    document = require('document'),
    user = require('user'),
    forms = require('forms');


/**
 * Registers a callback for viewing entries.
 */
app.get('/*', document.documentLoader, function(req, res, next) {
    if (!req.doc) { return next(); }

    res.render('document', {locals: req.doc.render(req)});

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
