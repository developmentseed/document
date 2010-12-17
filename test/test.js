/**
 * @fileoverview
 * Basic tests for document module.
 */

var app = require('expresslane').configure(__dirname);
var sys = require('sys');
var forms = require('forms');
require('user');
require('../lib/document');

// Regular expression used to extract the build id in the CSRF protected form.
var build_id_regex = /<input type="hidden" name="_build_id" id="id__build_id" class="hidden" value="(\S+)" \/>/;

module.exports = {
    /**
     * Logs in, attempt to create a new document, view that document then
     * delete it.
     */
    'document test': function(assert) {
        var headers = {
            'Content-Type' : 'application/x-www-form-urlencoded'
        }
        // Checks that the document form is protected.
        assert.response(app, {
            url: '/new/testdoc',
        }, {
            status: 403
        });
        assert.response(app, {
            url: '/login',
            method: 'POST',
            headers: headers,
            data: 'name=admin&password=admin&login=Login'
        }, {status: 302} , function(res) {
            sys.debug('logged in');
            // Stores the cookie header into reusable variable.
            headers['Cookie'] = res.headers['set-cookie'];

            // Creates arbitrary basic content document as a logged in user.
            assert.response(app, {
                url: '/new/testdoc',
                headers: headers,
                method: 'GET',
            }, {status: 200}, function(res) {
                // extract the build_id from this form.
                var build_id = build_id_regex.exec(res.body)[1];
                sys.debug('Fetched new document form build_id :' + build_id);

                // Creates arbitrary basic content document as a logged in user.
                assert.response(app, {
                    url: '/new/testdoc',
                    headers: headers,
                    method: 'POST',
                    data: '_id=test&field_title=Ewok&field_body=Hello+my+furry+friend.&submit=Submit&_build_id=' + build_id,
                }, {status: 302}, function(res) {
                    sys.debug('Submitted new document form build_id :' + build_id);
                    // Checks that the document was created.
                    assert.response(app, {
                        url: '/test',
                        headers: headers,
                    }, {
                        status: 200,
                        body: /Ewok/
                    });


                    // Checks that the unpublished content is not accesible by anonymous users.
                    assert.response(app, {
                        url: '/test',
                    }, {
                        status: 403
                    });

                    // Checks that the document edit form is protected.
                    assert.response(app, {
                        url: '/edit/test',
                    }, {
                        status: 403
                    });

                    assert.response(app, { 
                        url: '/edit/test',
                        headers: headers,
                        method: 'GET',
                    }, {status:200}, function(res) {
                        var build_id = build_id_regex.exec(res.body)[1];

                        sys.debug('fetched edit document form build_id :' + build_id);

                        // Edits basic content document as a logged in user sets document as unpublished.
                        assert.response(app, {
                            url: '/edit/test',
                            headers: headers,
                            method: 'POST',
                            data: '_id=test&field_title=Ewok&field_body=Hello+my+furry+friend.&field_published=&submit=Submit&_build_id=' + build_id,
                        }, {
                            status: 302
                        }, function(res) { 
                            sys.debug('edited document build_id :' + build_id)
                            // Checks that the document delete form is protected.
                            assert.response(app, {
                                url: '/delete/test',
                            }, {
                                status: 403
                            });

                            // Deletes created document as a logged in user.
                            assert.response(app, {
                                url: '/delete/test',
                                headers: headers,
                                method: 'POST',
                                data: 'delete=Delete'
                            }, {
                                status: 302
                            }, function(res) {
                                // Clear the form cache , to remove all the active timers.
                                forms.Form.cache.clear();
                            });

                        });
                    });

                });
            });
        });

    }
}
