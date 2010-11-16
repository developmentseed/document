
# Entry

Rudimentary content system for Express + CouchDB + HBS.

- Define one or more types of entries.
- Create, update, delete entries.
- Relate entries to each other in a hierarchy.

Entry can be used for instance to build a simple about section with a
hierarchical document structure.

## Installation

Add the following line to your ndistro file and rebuild:

    module developmentseed entry

Entry assumes an express server module `server` available that exposes an
`entryTypes` object describing all available entry types on (see usage)

    var entry_settings = require('server').set('settings')('entry')

## Requirements

- Express http://expressjs.com/
- CouchDB http://couchdb.apache.org/
- Cradle https://github.com/cloudhead/cradle
- Forms https://github.com/developmentseed/forms
- User https://github.com/developmentseed/user
- Hbs (view engine) https://github.com/developmentseed/hbs
- Markdown https://github.com/andris9/node-markdown

## Usage

### 1 Define an entry type

    var settings = {
        entry: {
            types: {
                'example': {
                    'name': 'Example',
                    'description': 'A simple example entry',
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
    require('server').set('settings', function(id) { return settings[id]; });

### 2 Go

- Create `new new/example`
- Edit `edit/testpage`
- Delete `delete/testpage`

## Todo

Plenty.
