'use strict';

var prompt = require('prompt')
  , fs     = require('fs')
  , pj     = require('prettyjson')
  , _      = require('lodash')
  , project = require('../project.js')
  , schema = {
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

//shamelessly taken from https://github.com/npm/init-package-json/blob/master/default-input.js
function getRepository(cb) {
  fs.readFile('.git/config', 'utf8', function(err, gconf) {
    if (err) return cb(err)

    var u, i
    gconf = gconf.split(/\r?\n/)
    i = gconf.indexOf('[remote "origin"]')
    if (i !== -1) {
      u = gconf[i + 1]
      if (!u.match(/^\s*url =/)) u = gconf[i + 2]
      if (!u.match(/^\s*url =/)) u = null
      else u = u.replace(/^\s*url = /, '')
    }
    if (u && u.match(/^git@github.com:/))
      u = u.replace(/^git@github.com:/, 'https://github.com/')

    cb(null, u)
  })
}

function getDefaults(mlpm, cb) {
  if (mlpm) {
    cb(null, {
      name: mlpm.name,
      version: mlpm.version,
      description: mlpm.description,
      repository: mlpm.repository
    })
  } else {
    getRepository(function(err, repository) {
      var defaults = {
            name: _.last(process.cwd().split('/')),
            version: '1.0.0'
          }
      if (repository) {
        defaults.repository = repository
      }
      cb(null, defaults)
    })
  }
}

function getSchema(mlpm, cb) {
  getDefaults(mlpm, function(err, defaults) {
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

module.exports = init
