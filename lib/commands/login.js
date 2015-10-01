'use strict'

var log = require('winston')
var prompt = require('prompt')
var util = require('../util.js')
var api = require('../api.js')
var schema = {
  properties: {
    token: {
      description: 'token',
      message: 'token is required',
      required: true
    }
  }
}

function doLogin(token, update) {
  api.login(token, function(err, credentials) {
    //TODO: handle different error types
    if (err) return log.error(err)

    // TODO: validate, warn if credentials already exist

    util.saveConfig(credentials, function(err) {
      if (err) {
        log.info('couldn\'t save credentials')
        return log.error(err)
      }

      log.info('authenticated ' + credentials.username)
    })
  })
}

function promptLogin(data, update) {
  if ( update ) {
    schema.properties.token.default = data.token
  }
  log.info('enter mlpm registry token')
  prompt.start()
  prompt.get(schema, function (err, result) {
    if (err) return log.error(err)

    doLogin(result.token, update)
  })
}

function login(args) {
  util.getConfig(function(err, data) {
    var update = (data && data.token)

    if ( !args.token ) return promptLogin(data, update)

    if (update) {
      if (data.token === args.token) return
      log.info('updating credentials')
    }
    doLogin(args.token, update)
  })
}

login.usage = 'mlpm login <token>'

module.exports.command = login
