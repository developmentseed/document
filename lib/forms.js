var app = require('expresslane').app,
    user = require('user'),
    strip_tags = require('expresslane').strip_tags,
    document = require('./document'),
    view = require('expresslane').view,
    _ = require('underscore')._,
    forms = require('forms');


/**
 * Form definition of edit form.
 */

var DocumentForm = forms.Form.create({
    CSRF: true,
    view: 'documentForm',
    fields: {
        _id: forms.fields.string({
              label: 'Path',
              required: true,
              widget: forms.widgets.text(),
              description: 'The path of this document will be accessed at.',
              validators: [
                  function (form, field, callback) {
                      form.document.checkId(field.value, function(err, id) {
                          if (err) {
                              callback(err);
                          }
                          else {
                              callback();
                          }
                      });
                  }
              ]
        }),
        published: forms.fields.boolean({
            label: 'Published',
            description: 'Display in listings.',
            default: 1,
            widget: forms.widgets.checkbox()
        }),
        submit: forms.fields.submit({
            value: 'Save',
            classes: ['action', 'submit'],
        }),
    }
  
});

DocumentForm.on('access', user.requirePermission('manage content'));

DocumentForm.on('request', function(req, res) {
    // Copy form values to document.
    for (var k in this.document.attributes) {
      if (this.fields[k]) {
        this.document.data[k] = this.instance[k];
      }
   }
});

DocumentForm.on('load', function(req, res, track) {
   var doc = require('./document');
   this.document = new doc.Document();
   this.visible_fields = [ '_id', 'published' ];
})


DocumentForm.on('build', function(req, res, track) {
    var that = this;
    this.visible_fields = this.visible_fields.concat(_(this.document.attributes).chain()
        .map(function(field, key) {
            if (field.form) {
                that.fields['field_' + field.id] = forms.fields.string({
                    label: field.label || field.id,
                    required: field.form['required'] || false,
                    description: field.description || false,
                    'default': field.default || undefined,
                    choices: field.form.choices || {},
                    weight: field.weight || 0,
                    widget: forms.widgets[field.form['widget']]({rows: 10})
                });
                return 'field_' + field.id;
            }
        })
        .compact()
        .sortBy(function(v) { return parseInt(that.fields[v] && that.fields[v].weight || 0);})
        .value());

    this.visible_fields.push( 'submit');
    if (this.fields.cancel !== undefined) {
      this.visible_fields.push( 'cancel');
    }
});

var NewDocumentForm = DocumentForm.create();

NewDocumentForm.on('load', function(req,res, track) {
  if (req.params[0]) {
    this.document.setType(req.params[0]);
    this.locals.pageTitle = 'Create new ' + strip_tags(this.document.data.type);
  }
  else {
    this.errors['help'] = 'No document type selected.';
  }
});

NewDocumentForm.on('success', function(req, res, track) {
  this.document.insert(
    track(function(err, doc) {
      req.form.redirect = '/' + doc.data._id;
    }));
});


var EditDocumentForm = DocumentForm.create({
    fields: {
        cancel: forms.fields.html({
            classes: ['action cancel'],
            value: function() {
              return '<a href="/' + this.form.document.data._id + '" class="button">Cancel</a>';
            }
        }),
    }
});


/**
 * Load the base object and copy the fields into the defaults.
 */
EditDocumentForm.on('load', function(req,res,track) {
    // Load the document specified by the url from the database.
    // we wrap the callback in the tracker decorator, so we can determine when it is called.
    this.document.load(req.params[0], track(function(err, ent) {
        // We just populate the defaults array of the form from the loaded data.
        // Any values that were submitted would be in form.instance, and would override
        // the loaded values
        req.form.defaults = forms.utils.deepClone(req.form.document.data);
        req.form.locals.suppressTitle = true;
        req.form.locals.title = 'Edit ' + strip_tags(req.form.document.data._id);
    }));
});

EditDocumentForm.on('success', function(req, res, track) {
  this.document.update(
    track(function(err, doc) {
      req.form.redirect = '/' + doc.data._id;
      res.redirect('/' + doc.data._id);
    })
  );
});

/**
 * Form definition of delete form.
 */
var DeleteDocumentForm = forms.Form.create({
    view: view('content'),
    fields: {
        delete: forms.fields.submit({
            value: 'Delete',
            classes: ['action delete'],
        }),
        cancel: forms.fields.html({
            classes: ['action cancel'],
            value : function() { 
              return '<a href="/' + this.form.document.data._id + '" class="button">Cancel</a>'; 
            } 
        })
    }
});

DeleteDocumentForm.on('access', user.requirePermission('manage content'));

DeleteDocumentForm.on('load', function(req, res, track) {
     var doc = require('./document');
     this.document = new doc.Document();

     this.document.load(req.params[0], track(function(err, ent) {
          req.form.defaults = forms.utils.deepClone(req.form.document.data);
          req.form.locals.suppressTitle = true;
          req.form.locals.title = 'Delete ' + strip_tags(req.form.document.data._id);
     }));
})

DeleteDocumentForm.on('success', function(request, response, track) {
        this.document.delete(track(function() {
            request.form.redirect = '/';
        }));
    }
);

module.exports = {
  'new': NewDocumentForm,
  'edit' : EditDocumentForm,
  'delete' : DeleteDocumentForm,
}
