'use strict';

var fs = require('fs')
  , prompt = require('prompt')

function promptAdmin(cb) {
  var schema = {
    properties: {
      user: {
        description: 'username',
        message: 'username is required',
        required: true
      },
      pass: {
        description: 'password',
        message: 'password is required',
        required: true,
        hidden: true
      }
    }
  }

  console.log('enter admin credentials')
  prompt.start()
  prompt.get(schema, function (err, result) {
    if (err) return cb(err)
    cb(null, result)
  })
}

function getAuth(admin, cb) {
  if (cb === null) {
    cb = admin
    admin = null
  }

  if ( admin ) return promptAdmin(cb)

  getConfig(function (err, data) {
    if (err) return cb(err)
    if ( !data.token ) return cb(new Error('no token'))

    cb(null, data.token)
  })
}

function readJson(path, cb) {
  fs.readFile(path, 'utf8', function (err, data) {
    if (err) return cb(err)

    cb(null, JSON.parse(data))
  })
}

function formatJson(data) {
  return JSON.stringify(data, null, 2) + '\n'
}

function writeJson(path, data, cb) {
  fs.writeFile(path, formatJson(data), cb)
}

function getUserHome() {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE
}

function getConfig(cb) {
  // TODO: store as props/INI instead of JSON ?
  readJson( getUserHome() + '/.mlpmrc', cb )
}

function saveConfig(data, cb) {
  // TODO: store as props/INI instead of JSON ?
  writeJson( getUserHome() + '/.mlpmrc', data, cb )
}

module.exports = {
  getAuth:    getAuth,
  readJson:   readJson,
  formatJson: formatJson,
  writeJson:  writeJson,
  getConfig:  getConfig,
  saveConfig: saveConfig
}
