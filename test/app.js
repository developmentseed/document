/**
 * @fileoverview
 * Use for running test application.
 */
require.paths.unshift(__dirname + 'modules', __dirname + 'lib/node', __dirname);
require.paths.unshift(__dirname + 'modules/forms/lib'); // Hack for forms...

// Start the express server using Express Lane, enable user.
require('expresslane').start();
require('../lib/user');
