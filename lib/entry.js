/**
 * @fileoverview
 *   Content entry system for express.
 */

var user = require('user'),
    view = require('expresslane').view,
    strip_tags = require('expresslane').strip_tags,
    settings = require('expresslane').app.set('settings')('entry');

/**
 * Entry constructor.
 * @constructor
 */
var Entry = function() {
    var that = this;

    this.db = new (require('cradle')).Connection;
    this.db = this.db.database(settings.database);

    // Rendering functions used for output, these should return one of;
    // - A string
    // - An object with at least the 'prose' or 'content' attribute populated,
    //   refer to the entry template for how these are handled..
    this.renderers = {
        'restrictedHTML': function(o) { return strip_tags(o); },
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
 * @param {string} id An entry id.
 * @return {string} A urlencoded id.
 */
Entry.prototype.fixId = function(id) {
    return encodeURIComponent(id);
};

/**
 * Cleans up an Id and makes sure it is unique.
 *
 * Use this before assigning an id to an entry.
 *
 * @param id
 *   Id to be checked against.
 * @param callback
 *   Function callback that receives an error string and the sanitized id.
 */
Entry.prototype.checkId = function(id, callback) {
    id = id.trim()
        .replace(/^(\/+)/, '')
        .replace(/(\/+)$/, '')
        .trim();
    // Tests whether reserved words occur in beginning of id.
    var valid = ['new', 'edit', 'delete'].every(function(word) {
        return (null == id.match(new RegExp("^" + word + "\\b(.*)", "i")));
    });
    if (!valid) {
        callback('This path is reserved', id);
    }
    else {
        var entry = new Entry;
        entry.load(id, function(err, entry) {
            if (err) {
                callback(null, id);
            }
            else {
                callback('This path is already in use', id);
            }
        });
    }
}

/**
 * Delete an entry from the database.
 *
 * @param {string} id An entry id.
 * @param {function} callback A function to call after deletion.
 */
Entry.prototype.delete = function(callback) {
    var that = this;
    id = this.fixId(this.data._id);
    this.db.remove(id, this.data._rev, function(err, doc) {
        callback ? callback(err, that) : null;
    });
};


/**
 * Insert a new Entry.
 * @param {function} callback A function to call after insertion.
 */
Entry.prototype.insert = function(callback) {
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
 * Load a specific entry by ID (aka path)
 * @param {string} id An entry id.
 * @param {function} callback A function to call after entry is loaded.
 */
Entry.prototype.load = function(id, callback) {
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
 * When insantiating an entry use this function to set the type and have the
 * proper field information loaded.
 */
Entry.prototype.setType = function(type) {
    var entryTypes = settings.types || {};
    this.data.type = type;
    if (entryTypes[type]) {
        for (var i in entryTypes[type]['fields']) {
            this.attributes['field_' + entryTypes[type]['fields'][i].id] = entryTypes[type]['fields'][i];
        }
    }
};

/**
 * Save a new revision of a Entry.
 * @param {function} callback A function to call after entry is updated.
 */
Entry.prototype.update = function(callback) {
    var that = this;
    var id = this.fixId(this.data._id);
    this.db.save(id, this.data._rev, this.data, function(err, doc) {
        callback ? callback(err, that) : null;
    });
};

/**
 * Renders a local actions object.
 */
Entry.prototype.renderActions = function() {
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
    }
}

/**
 * Render the Entry
 * @param {request} req The request object.
 * @return {object} Local template variables, ready for rendering.
 */
Entry.prototype.render = function(req) {
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
                if (typeof o === "string") {
                  o = {content: o};
                }
                output.push(o);
            }
        }
    }

    var locals = {};
    locals.pageTitle = this.data.title;
    locals.title = this.data.title;
    locals.content = { _template: __dirname + '/entry', items: output };

    if (user.permission(req, 'manage_content')) {
        locals.actions = this.renderActions();
    }

    return locals;
};

/**
 * Render entry form.
 * @param {request} req The request object.
 * @param {object} form A form object.
 * @return {object} Local template variables, ready for rendering.
 */
Entry.prototype.renderForm = function(req, form) {
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

/**
 * Form definition of edit form.
 */
Entry.prototype.editForm = function() {
    var that = this;
    return {
        fields: function() {
            var forms = require('forms');
            var field_def = {};
            if (!that.data._id) {
                field_def['_id'] = forms.fields.string({
                    label: 'Path',
                    required: true,
                    widget: forms.widgets.text(),
                    validators: [
                        function (form, field, callback) {
                            that.checkId(field.value, function(err, id) {
                                field.value = id;
                                if (err) {
                                    callback(err);
                                }
                                else {
                                    callback();
                                }
                            });
                        }
                    ]
                });
            }
            for (var i in that.attributes) {
                var field = that.attributes[i];
                if (field.form) {
                    field_def['field_' + field.id] = forms.fields.string({
                        label: field.label || field.id,
                        value: that.data['field_' + field.id] || (field.default || ''),
                        required: field.form['required'],
                        widget: forms.widgets[field.form['widget']]({rows: 10})
                    });
                }
            }
            field_def['published'] = forms.fields.boolean({
                label: 'Published',
                value: that.data['_id'] ? that.data['published'] : true,
                widget: forms.widgets.checkbox()
            });
            field_def['submit'] = forms.fields.submit({
                value: 'Save',
                classes: ['action', 'submit'],
                submit: function(form, request, response, next) {
                    // Copy form values to entry.
                    for (var k in that.attributes) {
                        if (form.def.fields[k]) {
                            that.data[k] = form.def.fields[k].value;
                        }
                    }
                    // If and _id field was present on the form, we are updating.
                    if (form.def.fields['_id']) {
                        that.insert(function() {
                            response.redirect('/' + that.data._id);
                        });
                    }
                    else {
                        that.update(function() {
                            response.redirect('/' + that.data._id);
                        });
                    }
                }
            });
            if (that.data._id) {
                field_def['cancel'] = forms.fields.html({
                    value: '<a href="/' + that.data._id + '" class="button">Cancel</a>',
                    classes: ['action', 'cancel']
                });
            }
            return field_def;
        },
        render: function(form, request, response, next) {
            // TODO: split renderForm() between this definition and Form object.
            response.render(view('content'), {locals: that.renderForm(request, form)});
        }
    };
}

/**
 * Form definition of delete form.
 */
Entry.prototype.deleteForm = function() {
    var that = this;
    return {
        fields: function() {
            var forms = require('forms');
            return {
                'delete': forms.fields.submit({
                    value: 'Delete',
                    classes: ['action delete'],
                    submit: function(form, request, response, next) {
                        that.delete(function() {
                            response.redirect('/');
                        });
                    }
                }),
                'cancel': forms.fields.html({
                    value: '<a href="/' + that.data._id + '" class="button">Cancel</a>',
                    classes: ['action cancel'],
                })
            };
        },
        render: function(form, request, response, next) {
            var locals = {
                'pageTitle': 'Delete ' + that.data.field_title,
                'title': 'Are you sure you want to delete ' + that.data.field_title + '?',
                'content': form.toHTML()
            };
            if (user.permission(request, 'manage_content')) {
                locals.actions = that.renderActions();
            }
            response.render(view('content'), {'locals': locals});
        }
    }
};

/**
 * Export as Common.js module.
 */
module.exports = {
    'Entry': Entry
};

// Registers request handlers.
// TODO Ideally, pages are a separate module from entry but living in the
// same directory.
require('./pages');
