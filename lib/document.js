/**
 * @fileoverview
 *   Content document system for express.
 */

var user = require('user'),
    view = require('expresslane').view,
    strip_tags = require('expresslane').strip_tags,
    settings = require('expresslane').app.set('document');

/**
 * Document constructor.
 * @constructor
 */
var Document = function() {
    var that = this;

    this.db = new (require('cradle')).Connection;
    this.db = this.db.database(settings.database);

    // Rendering functions used for output, these should return one of;
    // - A string
    // - An object with at least the 'prose' or 'content' attribute populated,
    //   refer to the document template for how these are handled..
    this.renderers = {
        'restrictedHTML': function(o) { return {prose: strip_tags(o)}; },
        'markdown': function(o) {
            md = require('markdown');
            return {prose: md.Markdown(o, true)};
        },
        'title' : function(o) {
            that.data.title = strip_tags(o); return null;
        }
    };

    // Default attributes.
    this.attributes = {
        '_id': {},
        'type': {},
        'schema': {},
        'published': {}
    };

    this.data = {};
};

/**
 * Cradle doesn't encode IDs for us, so it's done here. This is probably a bug
 * in cradle
 * @param {string} id An document id.
 * @return {string} A urlencoded id.
 */
Document.prototype.fixId = function(id) {
    return encodeURIComponent(id);
};

/**
 * Cleans up an Id and makes sure it is unique.
 *
 * Use this before assigning an id to an document.
 *
 * @param id
 *   Id to be checked against.
 * @param callback
 *   Function callback that receives an error string and the sanitized id.
 */
Document.prototype.checkId = function(id, callback) {
    id = id.trim()
        .replace(/^(\/+)/, '')
        .replace(/(\/+)$/, '')
        .trim();
    // Tests whether reserved words occur in beginning of id.
    var valid = ['new', 'edit', 'delete'].every(function(word) {
        return (null == id.match(new RegExp('^' + word + '\\b(.*)', 'i')));
    });
    if (!valid) {
        callback('This path is reserved', id);
    }
    else {
        var document = new Document;
        document.load(id, function(err, document) {
            if (err) {
                callback(null, id);
            }
            else {
                callback('This path is already in use', id);
            }
        });
    }
};

/**
 * Delete an document from the database.
 *
 * @param {string} id An document id.
 * @param {function} callback A function to call after deletion.
 */
Document.prototype.delete = function(callback) {
    var that = this;
    id = this.fixId(this.data._id);
    this.db.remove(id, this.data._rev, function(err, doc) {
        callback ? callback(err, that) : null;
    });
};


/**
 * Insert a new Document.
 * @param {function} callback A function to call after insertion.
 */
Document.prototype.insert = function(callback) {
    var that = this;
    var id = this.fixId(this.data._id);
    if (id) {
        this.db.save(id, this.data, function(err, doc) {
            callback ? callback(err, that) : null;
        });
    }
    else {
        callback ? callback({error: 'Path is required'}, that) : null;
    }
};

/**
 * Load a specific document by ID (aka path)
 * @param {string} id An document id.
 * @param {function} callback A function to call after document is loaded.
 */
Document.prototype.load = function(id, callback) {
    var that = this;
    id = this.fixId(id);

    this.db.get(id, function(err, doc) {
        if (!err) {
            // There is no preexisting _rev as cradle requires that a new
            // object must not have any. Populate separate from other
            // properties.
            that.data._rev = doc._rev;
            that.setType(doc.type);
            for (var i in that.attributes) {
                if (doc[i]) {
                    that.data[i] = doc[i];
                }
            }
        }
        else {
            that.status = err.error;
        }
        callback ? callback(err, that) : null;
    });
};

/**
 * When insantiating an document use this function to set the type and have the
 * proper field information loaded.
 */
Document.prototype.setType = function(type) {
    var documentTypes = settings.types || {};
    if (documentTypes[type]) {
        this.data.type = type;
        for (var i in documentTypes[type]['fields']) {
            this.attributes['field_' + documentTypes[type]['fields'][i].id] = documentTypes[type]['fields'][i];
        }
        return true;
    }
    return false;
};

/**
 * Save a new revision of a Document.
 * @param {function} callback A function to call after document is updated.
 */
Document.prototype.update = function(callback) {
    var that = this;
    var id = this.fixId(this.data._id);
    this.db.save(id, this.data._rev, this.data, function(err, doc) {
        callback ? callback(err, that) : null;
    });
};

/**
 * Renders a local actions object.
 */
Document.prototype.renderActions = function() {
    return {
        title: 'Actions',
        items: [
            { title: 'View', path: '/' + this.data._id},
            { title: 'Edit', path: '/edit/' + this.data._id},
            { title: 'Delete', path: '/delete/' + this.data._id},
            { title: 'New', path: '/new/' + this.data.type}
        ],
        _template: view('list'),
        class: 'actions'
    };
};

/**
 * Render the Document
 * @param {request} req The request object.
 * @return {object} Local template variables, ready for rendering.
 */
Document.prototype.render = function(req) {
    var output = [];
    for (var i in this.attributes) {
        var field = this.attributes[i];
        if (field.render !== false && this.data['field_' + field.id]) {
            var o = null;
            // If a there is a specific renderer setup and available for this
            // field it is run. Otherwise we toString() the input and strip
            // potentially troublesome tags.
            if (field.render && this.renderers[field.render]) {
                o = this.renderers[field.render](this.data['field_' + field.id]);
            }
            else {
                o = strip_tags(this.data['field_' + field.id].toString());
            }
            if (o) {
                if (typeof o === 'string') {
                  o = {content: o};
                }
                output.push(o);
            }
        }
    }

    var locals = {};
    locals.pageTitle = this.data.title;
    locals.suppressTitle = true;
    locals.title = this.data.title;
    locals.content = { _template: __dirname + '/document', items: output };

    if (user.permission(req, 'manage_content')) {
        locals.actions = this.renderActions();
    }

    return locals;
};

/**
 * Render document form.
 * @param {request} req The request object.
 * @param {object} form A form object.
 * @return {object} Local template variables, ready for rendering.
 */
Document.prototype.renderForm = function(req, form) {
    var locals = {
        pageTitle: 'Create new ' + strip_tags(this.data.type),
        title: 'Create new ' + strip_tags(this.data.type)
    };
    if (this.data._id) {
        locals.title =
        locals.pageTitle = 'Edit ' + strip_tags(this.data.field_title);
        if (user.permission(req, 'manage_content')) {
            locals.actions = this.renderActions();
        }
    }
    locals.content = form.toHTML();
    return locals;
};



function documentLoader(req, res, next) {
    if (req.doc) { return next(); }
    var ent = new (require('./document')).Document();
    ent.load(req.params[0], function(err, ent) {
        if (err) { return next(); }

        req.doc = ent;

        // the menu should always have itself as a sibling.
        ent.tree = {
            children: [],
            siblings: [{ 
                path: ent.data._id,
                title: ent.data.field_title,
                weight: ent.data.field_weight
            }],
            parent: null,
        }

        ent.db.view('pages/hierarchy', {
            key: ent.data._id,
        }, function(err, results) {
            if (err) { return next() }

            ent.tree.children = results.reduce(function(result, current) {
                if (current.value.path !== ent.data._id) {
                    current.value && result.push(current.value);
                }
                return result;
            }, []);


            var parent_id = ent.data.field_parent || null

            if (!parent_id) { return next(); }
            ent.db.get(ent.fixId(parent_id), function(err, parent) {
                if (parent) {
                    ent.tree.parent = parent;
                }

                ent.db.view('pages/hierarchy', {
                    key: parent_id,
                }, function(err, results) {
                    if (err) { return next() }

                    var siblings = results.reduce(function(result, current) {
                        current.value && result.push(current.value);
                        return result;
                    }, []);

                    siblings.length && (ent.tree.siblings = siblings);

                    req.doc = ent;
                    next();
                });
            });
         });
    });
}
/**
 * Export as Common.js module.
 */
module.exports = {
    'Document': Document,
    documentLoader: documentLoader,
    'forms' : require('./forms')
};

