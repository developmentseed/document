/**
 * @fileoverview
 *   Registers request handlers for document module upon inclusion.
 */

var app = require('expresslane').app,
    view = require('expresslane').view,
    document = require('./document'),
    user = require('user'),
    forms = require('forms');

/**
 * Registers a callback for viewing entries.
 */
app.get('/*', function(req, res, next) {
    if (req.params[0]) {
        var ent = new (require('./document')).Document();
        ent.load(req.params[0], function(err, ent) {
            if (!err) {
                // Add render and attribute for the hierarchy links.
                ent.data.field_hierarchy = [];
                ent.attributes.field_hierarchy = { id: 'hierarchy', render: 'linkList' };
                ent.renderers.linkList = function(field) {
                  return {content: {
                      _template: view('list'),
                      class: 'block',
                      title: field.title,
                      items: field.items
                  }};
                }

                // Setup our callback.
                var counter = 0;
                var counter_lim = (ent.data.field_parent ? 2 : 1);
                var children = { _template: view('list'), items: []};
                var neighbors = {items: []};
                var callback = function(type, result) {
                    if (type === 'neighbors') {
                      result.forEach(function(i) {
                          if (i.path === ent.data.field_parent) {
                              neighbors.title = i;
                          }
                          else {
                              neighbors.items.push(i);
                          }
                      });
                      neighbors.items.sort(function(a, b){
                          return (a.weight || 0) - (b.weight || 0);
                      });
                    }
                    else if (type === 'children') {
                      result.forEach(function(i) {
                          if (i.path !== ent.data._id) {
                              children.items.push(i);
                          }
                      });
                      children.items.sort(function(a, b) {
                          return (a.weight || 0) - (b.weight || 0);
                      });
                    }

                    counter++;
                    if (counter === counter_lim) {
                        if (neighbors.items.length > 0) {
                          for (var i in neighbors.items) {
                              if (neighbors.items[i].path === ent.data._id) {
                                  neighbors.items[i].children = children;
                                  neighbors.items[i].class = 'active';
                              }
                          }
                          ent.data.field_hierarchy = neighbors;
                        }
                        else {
                            // things are different for a root level.
                            ent.data.field_hierarchy = {
                              title: ent.data.field_title,
                              items: children.items
                            };
                        }
                        if (user.permission(req, 'manage_content') || ent.data['published'] == 'on') {
                            res.render(view('content'), {locals: ent.render(req)});
                        }
                        else {
                            res.send(403);
                        }
                    }
                }

                // Query for children
                var options = {key: ent.data._id};
                ent.db.view('pages/hierarchy', options, function(err, rows) {
                    var result = [];
                    if (rows.length) {
                        rows.forEach(function(key, value) {
                            result.push(value);
                        });
                    }
                    callback('children', result);
                });

                // If we're not a root page, query for neighbors.
                if (ent.data.field_parent) {
                  var options = {key: ent.data.field_parent};
                  ent.db.view('pages/hierarchy', options, function(err, rows) {
                      var result = [];
                      if (rows.length) {
                          rows.forEach(function(key, value) {
                              result.push(value);
                          });
                      }
                      callback('neighbors', result);
                  });
                }
            } else {
              next();
            }
        });
    }
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
