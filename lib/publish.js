'use strict';

var fs     = require('fs')
  , vfs    = require('vinyl-fs')
  , JSZip  = require('jszip')
  , async  = require('async')
  , _      = require('lodash')
  , lib    = require('./mlpm-lib.js')
  , api    = require('./api.js')
  , ignore = [
      'mlpm_modules',
      '.*.swp',
      '._*',
      '.DS_Store',
      '.git',
      '.hg',
      '.lock-wscript',
      '.svn',
      '.wafpickle-*',
      'CVS',
      'npm-debug.log'
    ]

function getGlobs(cb) {
  async.map(['.mlpmignore', '.gitignore'], function(file, cb) {
    fs.readFile(file, function(err, data) {
      if (err) return cb(null, [])
      cb(null, data.toString().split(/\r?\n/))
    })
  }, function(err, globs) {
    var result = _.chain([ignore, globs])
        .flatten()
        .compact()
        .uniq()
        .map(function(line) { return '!' + line; })
        .value()

    result.push('*')
    cb(null, result)
  })
}

function createZip(cb) {
  var zip = new JSZip()

  getGlobs(function(err, globs) {
    if (err) return cb(err)


    var src = vfs.src(globs)
      , cwd = process.cwd() + '/'

    src.on('data', function(file) {
      var filePath = file.path.replace(cwd, '')
      zip.file( filePath, file.contents )
    })

    src.on('error', function(err) {
      cb(err)
    })

    src.on('end', function() {
      if ( _.keys( zip.files ).length === 0 ) {
        return cb(new Error('aborting, empty zip'))
      }

      cb( null, zip.generate({type: 'nodebuffer'}) )
    })
  })
}

function publish() {
  async.series({
    auth: lib.getAuth,
    mlpm: lib.getMlpm,
    buffer: createZip
  }, function(err, results) {
    if (err) return console.log(err)

    api.publish(results.mlpm, results.buffer, results.auth, function(err, body) {
      if (err) return console.log(err)

      console.log(body)
      console.log('successfull published package: ' + results.mlpm.name)
    })
  })
}

module.exports = publish
