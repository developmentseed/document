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

DocumentForm.on('request', function(req, res, next) {
    // Copy form values to document.
    for (var k in this.document.attributes) {
      if (this.fields[k]) {
        this.document.data[k] = this.instance[k];
      }
   }
});

DocumentForm.prototype.fields.published = forms.fields.boolean({
      label: 'Published',
      default : true,
      widget: forms.widgets.checkbox()
});

DocumentForm.prototype.fields.submit = forms.fields.submit({
    value: 'Save',
    classes: ['action', 'submit'],
});

DocumentForm.on('load', function(req, res, next) {
   var doc = require('./document');
   this.document = new doc.Document();
})

DocumentForm.on('access', user.requirePermission('manage content'));

DocumentForm.on('build', function(req, res, next) {
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

NewDocumentForm.on('load', function(req,res,next) {
  if (req.params[0]) {
    this.document.setType(req.params[0]);
  }
  else {
    this.errors['help'] = 'help';
  }
});

NewDocumentForm.on('success', function(req, res, next) {
  this.document.insert(
    function() {
      response.redirect('/' + this.data._id);
    }
  );
});

NewDocumentForm.prototype.render = function(req, res,next) {
    res.render(view('content'), {
        locals: {
          pageTitle: 'Create new ' + strip_tags(this.document.data.type),
          title: 'Create new ' + strip_tags(this.document.data.type),
          content: this.toHTML()
        }
    });
}


var EditDocumentForm = forms.createForm(DocumentForm);

/**
 * Load the base object and copy the fields into the defaults.
 */
EditDocumentForm.on('load', function(req,res,next) {
    this.document.load(req.params[0], function(err, ent) {
        req.form.defaults = forms.utils.deepClone(req.form.document.data);
    });
});


EditDocumentForm.prototype.fields.cancel = forms.fields.html({
  //  get value() { return '<a href="/' + this.form.document.data._id + '" class="button">Cancel</a>' },
    classes: ['action', 'cancel']
});

EditDocumentForm.on('success', function(req, res, next) {
  this.document.update(
    function() {
      res.redirect('/' + this.data._id);
    }
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
//    value: '<a href="/' + that.data._id + '" class="button">Cancel</a>',
    classes: ['action cancel'],
});

DeleteDocumentForm.on('success', 
    function(request, response, next) {
        this.document.delete(function() {
            response.redirect('/');
        });
    }
);


module.exports = {
  'NewDocumentForm': NewDocumentForm,
  'EditDocumentForm' : EditDocumentForm,
  'DeleteDocumentForm' : DeleteDocumentForm
}
