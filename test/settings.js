/**
 * @fileoverview
 * Test settings.
 */

/**
 * Document types.
 */
var documentTypes = {
    'testdoc': {
        'name': 'Test',
        'description': 'Test document.',
        'fields': [
            {
                id: 'title',
                label: 'Title',
                form: {
                    widget: 'text',
                    required: true
                },
                render: 'title',
            },
            {
                id: 'body',
                label: 'Body',
                default: '',
                form: {
                    widget: 'textarea',
                    required: false
                },
                render: 'markdown'
            },
            {
                id: 'parent',
                label: 'Parents',
                default: [],
                form: {
                    widget: 'text',
                    required: false
                },
                render: false,
            },
            {
                id: 'weight',
                label: 'Menu weight',
                default: 0,
                form: {
                    widget: 'text',
                    required: false
                },
                render: false,
            }
      ]
    }
};

// Allowed users. See user README.
var users = {
    admin: {
        name: 'admin',
        salt: 'qbtNjBqo34N2UkvpgtEMFwAA',
        password: 'd85fe0eb722a058557b48a643434f691'
    }
};

module.exports = {
    document: {
        types: documentTypes,
        database: 'test_documents'
    },
    user: {
        users: users
    }
};
