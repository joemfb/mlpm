'use strict'

var log = require('winston')
var prompt = require('prompt')
var pj = require('prettyjson')
var _ = require('lodash')
var project = require('../project.js')

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
  log.info( pj.render(mlpm) )

  prompt.start()
  prompt.get(conf, function(err, result) {
    if (err) return log.error(err)

    if (result && (result.save === 'y' || result.save === 'yes')) {
      project.saveConfig(mlpm, function(err) {
        if (err) return log.error(err)
      })
    }
  })
}

function init() {
  project.getConfig(function(err, mlpm) {
    if (err) mlpm = {}

    getSchema(mlpm, function(err, schema) {
      if (err) return log.error(err)

      prompt.start()
      prompt.get(schema, function (err, result) {
        if (err) return log.error(err)

        save(_.extend(mlpm, result))
      })
    })
  })
}

init.usage = 'mlpm init'

module.exports.command = init
