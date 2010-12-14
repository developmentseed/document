var app = require('expresslane').app,
    user = require('user'),
    strip_tags = require('expresslane').strip_tags,
    document = require('./document'),
    view = require('expresslane').view,
    forms = require('forms');


/**
 * Form definition of edit form.
 */

var DocumentForm = forms.createForm();

DocumentForm.prototype.fields._id = forms.fields.string({
      label: 'Path',
      required: true,
      widget: forms.widgets.text(),
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
  }); 

DocumentForm.on('request', function(req, res) {
    // Copy form values to document.
    for (var k in this.document.attributes) {
      if (this.fields[k]) {
        this.document.data[k] = this.instance[k];
      }
   }
});

DocumentForm.prototype.fields.published = forms.fields.boolean({
      label: 'Published',
      widget: forms.widgets.checkbox()
});

DocumentForm.prototype.fields.submit = forms.fields.submit({
    value: 'Save',
    classes: ['action', 'submit'],
});

DocumentForm.on('load', function(req, res, track) {
   var doc = require('./document');
   this.document = new doc.Document();
})

DocumentForm.on('access', user.requirePermission('manage content'));

DocumentForm.on('build', function(req, res, track) {
   this.visible_fields = [ '_id', 'published' ];

    for (var i in this.document.attributes) {
        var field = this.document.attributes[i];
        if (field.form) {
          this.visible_fields.push('field_' + field.id);

            this.fields['field_' + field.id] = forms.fields.string({
                label: field.label || field.id,
                required: field.form['required'] || false,
                widget: forms.widgets[field.form['widget']]({rows: 10})
            });
        }
    }

    this.visible_fields.push( 'submit');
    if (this.fields.cancel !== undefined) {
      this.visible_fields.push( 'cancel');
    }
});

var NewDocumentForm = forms.createForm(DocumentForm);

NewDocumentForm.on('load', function(req,res, track) {
  if (req.params[0]) {
    this.document.setType(req.params[0]);
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

NewDocumentForm.prototype.render = function(req, res) {
    res.render(view('content'), {
        locals: {
          pageTitle: 'Create new ' + strip_tags(this.document.data.type),
          title: 'Create new ' + strip_tags(this.document.data.type),
          content: this.toHTML()
        }
    });
}


var EditDocumentForm = forms.createForm(DocumentForm);

EditDocumentForm.prototype.fields.cancel = forms.fields.html({
    classes: ['action cancel'],
    value: function() {
      return '<a href="/' + this.form.document.data._id + '" class="button">Cancel</a>';
    }
});


EditDocumentForm.prototype.render = function(req, res) {
    res.render(view('content'), {
        locals: {
          pageTitle: 'Edit ' + strip_tags(this.document.data._id),
          title: 'Edit ' + strip_tags(this.document.data._id),
          content: this.toHTML()
        }
    });
}

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

var DeleteDocumentForm = forms.createForm();

DeleteDocumentForm.prototype.fields.delete = forms.fields.submit({
  value: 'Delete',
  classes: ['action delete'],
});

DeleteDocumentForm.prototype.fields.cancel = forms.fields.html({
    classes: ['action cancel'],
    value : function() { return '<a href="/' + this.form.document.data._id + '" class="button">Cancel</a>'; } 
});


DeleteDocumentForm.on('access', user.requirePermission('manage content'));

DeleteDocumentForm.on('load', function(req, res, track) {
   var doc = require('./document');
   this.document = new doc.Document();
   this.document.load(req.params[0], track(function(err, ent) {
      req.form.defaults = forms.utils.deepClone(req.form.document.data);
   }));
})

DeleteDocumentForm.on('success', 
    function(request, response, track) {
        this.document.delete(track(function() {
            request.form.redirect = '/';
        }));
    }
);

DeleteDocumentForm.prototype.render = function(req, res) {
    res.render(view('content'), {
        locals: {
          pageTitle: 'Delete ' + strip_tags(this.document.data._id),
          title: 'Delete ' + strip_tags(this.document.data._id),
          content: this.toHTML()
        }
    });
}

module.exports = {
  'NewDocumentForm': NewDocumentForm,
  'EditDocumentForm' : EditDocumentForm,
  'DeleteDocumentForm' : DeleteDocumentForm
}
