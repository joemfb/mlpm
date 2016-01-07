'use strict'

var fs = require('fs')
  , byline = require('byline')
  , prompt = require('prompt')
  // , process = require('process')

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
  prompt.get(schema, cb)
}

function getAuth(admin, cb) {
  if ( !cb ) {
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

    try { var json = JSON.parse(data) }
    catch (err) { return cb(err) }

    cb(null, json)
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

function readByLine(filePath, cb, end) {
  var fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' })
  var lineStream = byline.createStream(fileStream)
  var resumed = true

  lineStream.on('data', function(line) {
    lineStream.pause()
    resumed = false
    cb(line.toString(),
      function() {
        lineStream.resume()
        resumed = true
      },
      function() {
        // TODO: backwards compat?
        // if ( fileStream.destroy ) return fileStream.destroy()
        fileStream.unpipe()
      })
  })

  lineStream.on('end', function() {
    if (resumed && end) return end()
  })
}

module.exports = {
  getAuth:    getAuth,
  readJson:   readJson,
  formatJson: formatJson,
  writeJson:  writeJson,
  getConfig:  getConfig,
  saveConfig: saveConfig,
  readByLine: readByLine
}
