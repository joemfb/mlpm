'use strict';

var fs = require('fs')
  , vfs = require('vinyl-fs')
  , JSZip = require('jszip')
  , async = require('async')
  , _ = require('lodash')
  , lib = require('./mlpm-lib.js')
  , api = require('./api.js')
  , include = [
      '*',
      'src/**/*',
      'lib/**/*',
      'rest-api/(ext|transform|service)/**/*'
    ]
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
    ignore = _.chain([ignore, globs])
      .flatten()
      .compact()
      .uniq()
      .map(function(line) { return '!' + line; })
      .value()

    cb(null, include.concat(ignore))
  })
}

function createZip(cb) {
  var zip = new JSZip()

  getGlobs(function(err, globs) {
    if (err) return cb(err)

    var src = vfs.src(globs)
      , cwd = process.cwd() + '/'

    src.on('data', function(file) {
      if ( file.stat.isFile() ) {
        zip.file( file.path.replace(cwd, ''), file.contents )
      }
    })

    src.on('error', cb)

    src.on('end', function() {
      if ( _.keys( zip.files ).length === 0 ) {
        return cb(new Error('aborting, empty zip'))
      }

      cb( null, zip )
    })
  })
}

function publish() {
  async.series({
    auth: lib.getAuth,
    mlpm: lib.getMlpm,
    zip: createZip
  }, function(err, results) {
    if (err) return console.log(err)

    var buffer = results.zip.generate({type: 'nodebuffer'})

    api.publish(results.mlpm, buffer, results.auth, function(err, body) {
      if (err) return console.log(err)

      console.log( 'published ' + results.mlpm.name + '@' + results.mlpm.version )
    })
  })
}

publish.usage = 'mlpm publish'

module.exports = publish
