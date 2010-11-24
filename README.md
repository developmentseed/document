
# Document

Rudimentary content system for [Express Lane](https://github.com/developmentseed/expresslane).

- Define one or more types of documents.
- Create, update, delete documents.
- Relate documents to each other in a hierarchical manner.

## Installation

Add the following line to your ndistro file and rebuild:

    module developmentseed document [version]

Document assumes the `expresslane` module to be available that exposes an
`documentTypes` object describing all available document types and a `database`
string identifying the databse to use for documents (see usage).

    var settings = require('expresslane').app.set('settings')('document')
    var documentTypes = document_settings.documentTypes;
    var database = settings.database;

## Requirements

- [Express Lane](https://github.com/developmentseed/expresslane) and dependencies.
- CouchDB http://couchdb.apache.org/
- Cradle https://github.com/cloudhead/cradle
- Forms https://github.com/developmentseed/forms
- User https://github.com/developmentseed/user
- Markdown https://github.com/andris9/node-markdown

## Usage

### 1 Define the database name and an document type

    // settings.js
    module.exports = {
        document: {
            database: 'docs',
            types: {
                'example': {
                    'name': 'Example',
                    'description': 'A simple example document',
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
                        }
                  ]
                }
            }
        }
    };

### 2 Import design documents into couchdb

    curl -X PUT http://127.0.0.1:5984/[database]/_design/pages -d @design_docs/pages.json

### 3 Go

- Create `new new/example`
- Edit `edit/testpage`
- Delete `delete/testpage`

## Todo

Plenty.
