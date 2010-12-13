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
                ent.attributes.field_hierarchy= { id: 'hierarchy', render: 'linkList' };
                ent.renderers.linkList = function(field) {
                  return {content: {
                      _template: view('list'),
                      class:'block',
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
                    }
                    else if (type === 'children') {
                      result.forEach(function(i) {
                          if (i.path !== ent.data._id) {
                              children.items.push(i);
                          }
                      });
                      children.items.sort(function(a, b){
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
app.get('/new/*', forms.loadForm(document.forms.NewDocumentForm), function(req, res, next) {
    req.form.render(req, res, next);
});

/**
 * Handle submission of new form.
 */
app.post('/new/*', forms.loadForm(document.forms.NewDocumentForm), function(req, res, next) {
    req.form.process(req, res, next);
});



/**
 * Expose edit form.
 */
app.get('/edit/*', forms.loadForm(document.forms.EditDocumentForm), function(req, res, next) {
    req.form.render(req, res, next);
});

/**
 * Expose delete form.
 *
 * TODO: Push delete form definition into Document. It is defined inline here
 *   only for the sake of illustrating Forms work.
 */
app.get('/delete/*', forms.loadForm(document.forms.DeleteDocumentForm), function(req, res, next) {
    req.form.render(req, res, next);
});
