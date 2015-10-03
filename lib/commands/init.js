'use strict'

var prompt = require('prompt')
  , pj = require('prettyjson')
  , _ = require('lodash')
  , project = require('../project.js')

function getSchema(mlpm, cb) {
  var schema = {
    properties: {
      name: {
        description: 'name',
        message: 'name is required',
        required: true
      },
      version: {
        pattern: /\d(\.\d){2}/,
        description: 'version',
        message: 'version is required',
        required: true
      },
      description: {
        description: 'description',
        message: 'description is required',
        required: true
      },
      repository: {
        description: 'git repository'
      }
    }
  }

  project.getDefaultConfig(mlpm, function(err, defaults) {
    if (err) return cb(err)

    _.forIn(defaults, function(value, name) {
      schema.properties[name].default = value
    })
    cb(null, schema)
  })
}

function save(mlpm) {
  var conf = [{ name: 'save', description: 'Is this ok?', default: 'yes' }]
  console.log( pj.render(mlpm) )

  prompt.start()
  prompt.get(conf, function(err, result) {
    if (err) return console.log(err)

    if (result && (result.save === 'y' || result.save === 'yes')) {
      project.saveConfig(mlpm, function(err) {
        if (err) return console.log(err)
      })
    }
  })
}

function init() {
  project.getConfig(function(err, mlpm) {
    getSchema(mlpm, function(err, schema) {
      if (err) return console.log(err)

      prompt.start()
      prompt.get(schema, function (err, result) {
        if (err) return console.log(err)

        if (mlpm) {
          result = _.extend(mlpm, result)
        }

        save(result)
      })
    })
  })
}

init.usage = 'mlpm init'

module.exports.command = init
