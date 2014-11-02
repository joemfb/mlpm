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

function promptAuth(cb) {
  prompt.start()
  prompt.get(schema, function (err, result) {
    if (err) return cb(err)
    cb(null, result)
  })
}

function getAuth(cb) {
  getConfig(function (err, data) {
    if (!err) return cb(null, data)

    promptAuth(function(err, result) {
      if (err) return cb(err)

      saveConfig(result, function(err) {
        if (err) console.log('couldn\'t save credentials')
        cb(null, result)
      })
    })
  })
}

function getMlpm(cb) {
  fs.readFile('mlpm.json', 'utf8', function (err, data) {
    if (err) return cb(err)
    cb(null, JSON.parse(data))
  })
}

function saveMlpm(data, cb) {
  var output = JSON.stringify(data, null, 2)
  fs.writeFile('mlpm.json', output, cb)
}

function getUserHome() {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE
}

function getConfig(cb) {
  fs.readFile( getUserHome() + '/.mlpmrc', 'utf8', function (err, data) {
    if (err) return cb(err)
    // TODO: parse props / INI
    cb(null, JSON.parse(data))
  })
}

function saveConfig(data, cb) {
  // TODO: write props / INI
  var output = JSON.stringify(data, null, 2)
  fs.writeFile( getUserHome() + '/.mlpmrc', output, cb)
}

module.exports = {
  getAuth:  getAuth,
  getMlpm:  getMlpm,
  saveMlpm: saveMlpm
}
