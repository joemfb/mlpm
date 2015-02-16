'use strict';

var fs = require('fs')
  , prompt = require('prompt')
  , schema = {
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

function promptAdmin(cb) {
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

function writeJson(path, data, cb) {
  var output = JSON.stringify(data, null, 2) + '\n'
  fs.writeFile(path, output, cb)
}

function getMlpm(cb) {
  readJson('mlpm.json', cb)
}

function saveMlpm(data, cb) {
  writeJson('mlpm.json', data, cb)
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
  writeJson:  writeJson,
  getMlpm:    getMlpm,
  saveMlpm:   saveMlpm,
  getConfig:  getConfig,
  saveConfig: saveConfig
}
