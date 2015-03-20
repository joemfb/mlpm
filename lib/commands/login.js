'use strict';

var prompt = require('prompt')
  , lib = require('../mlpm-lib.js')
  , api = require('../api.js')
  , schema = {
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
    if (err) return console.log(err)
    // TODO: validate, warn if credentials already exist

    lib.saveConfig(credentials, function(err) {
      if (err) {
        console.log('couldn\'t save credentials')
        return console.log(err)
      }

      console.log('authenticated ' + credentials.username)
    })
  })
}

function promptLogin(data, update) {
  if ( update ) {
    schema.properties.token.default = data.token
  }
  console.log('enter mlpm registry token')
  prompt.start()
  prompt.get(schema, function (err, result) {
    if (err) return console.log(err)

    doLogin(result.token, update)
  })
}

function login(args) {
  lib.getConfig(function(err, data) {
    var update = (data && data.token)

    if ( !args.token ) return promptLogin(data, update)

    if (update) {
      if (data.token === args.token) return
      console.log('updating credentials')
    }
    doLogin(args.token, update)
  })
}

login.usage = 'mlpm login <token>'

module.exports = login
