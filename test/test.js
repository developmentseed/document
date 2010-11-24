/**
 * @fileoverview
 * Basic tests for document module.
 */

var app = require('expresslane').configure(__dirname);
require('user');
require('../lib/document');

module.exports = {
    /**
     * Logs in, attempt to create a new document, view that document then
     * delete it.
     */
    'document test': function(assert) {
        var headers = {
            'Content-Type' : 'application/x-www-form-urlencoded'
        }
        assert.response(app, {
            url: '/login',
            method: 'POST',
            headers: headers,
            data: 'name=admin&password=admin&login=Login'
        }, {status: 302} , function(res) {
            // Stores the cookie header into reusable variable.
            headers['Cookie'] = res.headers['set-cookie'];

            // Creates arbitrary basic content document as a logged in user.
            assert.response(app, {
                url: '/new/testdoc',
                headers: headers,
                method: 'POST',
                data: '_id=test&field_title=Ewok&field_body=Hello+my+furry+friend.&submit=Submit'
            }, {
                status: 302
            });

            // Checks that the document was created.
            assert.response(app, {
                url: '/test',
                headers: headers,
            }, {
                status: 200,
                body: /Ewok/
            });

            // Edits basic content document as a logged in user sets document as unpublished.
            assert.response(app, {
                url: '/edit/test',
                headers: headers,
                method: 'POST',
                data: '_id=test&field_title=Ewok&field_body=Hello+my+furry+friend.&field_published=&submit=Submit'
            }, {
                status: 302
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

            // Checks that the document delete form is protected.
            assert.response(app, {
                url: '/delete/test',
            }, {
                status: 403
            });

            // Checks that the document form is protected.
            assert.response(app, {
                url: '/new/testdoc',
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
            });
        });
    }
}
