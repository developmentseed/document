// Make sure expresslane finds settings.js.
require.paths.unshift(__dirname);

var app = require('expresslane').configure();
require('user');
require('document');

module.exports = {
    /**
     * Logs in as a user attempts to create a new
     * entry, view that entry then delete that entry.
     */
    'web': function(assert) {
        var headers = {
            'Content-Type' : 'application/x-www-form-urlencoded'
        };
        // /user is protected, resulting in a redirect to /login.
        assert.response(app, {
            url: '/user',
            method: 'GET',
            headers: headers
        }, {
            status: 302
        });

        // Checks if username is wrong user is redirected to login page.
        assert.response(app, {
           url: '/login',
           method: 'POST',
           headers: headers,
           data: 'name=wronguser&password=admin&login=Login'
        }, {
            body: /.*Unknown user.*/,
            status: 200
        });

        // Checks if password is wrong user is redirected to login page.
        assert.response(app, {
           url: '/login',
           method: 'POST',
           headers: headers,
           data: 'name=admin&password=wrongpassword&login=Login'
        }, {
            body: /.*Wrong password.*/,
            status: 200
        });

        // Login.
        assert.response(app, {
            url: '/login',
            method: 'POST',
            headers: headers,
            data: 'name=admin&password=admin&login=Login'
        }, function(res) {
            // Use cookie for subsequent responses.
            headers = {
                'Cookie': res.headers['set-cookie']
            };

            // Login should redirect to /user now.
            assert.response(app, {
                url: '/login',
                method: 'GET',
                headers: headers
            }, {
                status: 302
            });

            // User is accessible.
            assert.response(app, {
                url: '/user',
                method: 'GET',
                headers: headers
            }, {
                body: /.*admin.*/,
                status: 200
            });
        });
    }
}
