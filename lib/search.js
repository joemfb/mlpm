'use strict';

var _ = require('lodash')
  , columnify = require('columnify')
  , api = require('./api.js')

function transformMetadata(result) {
  var metadata = result.metadata
  result.metadata = {}

  _.each(metadata, function(obj) {
    var key = _.without(_.keys(obj), 'metadata-type')[0]
      , newKey = key.replace('{http://mlpm.org/ns}', '')
      , type = obj[ 'metadata-type' ]
      , value = obj[ key ]

    if (! result.metadata[ newKey ] ) {
      result.metadata[ newKey ] = { 'metadata-type': type, values: [] }
    }

    result.metadata[ newKey ].values.push(value)
  })
}

function getValue(result, key) {
  return _.last( result.metadata[ key ].values )
}

function selectMetadata(result) {
  transformMetadata(result)
    return {
      name:        getValue(result, 'name'),
      description: getValue(result, 'description'),
      // author:      getValue(result, 'author'),
      version:     getValue(result, 'version'),
      modified:    getValue(result, 'modified').split('T')[0]
    }
}

function search(args) {
  api.search(args.query, function(err, data) {
    if (err) return console.log(err)

    var out = _.compose(console.log, columnify)

    out( _.map(data.results, selectMetadata) )

    // note if there are more results
    if ( data.total > data['page-length'] ) {
      console.log('(page 1 of ' + ((data.total / data['page-length'])|0) + ')')
    }
  })
}

search.usage = 'mlpm search [query terms]'

module.exports = search
