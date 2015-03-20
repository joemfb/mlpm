'use strict';

var fs = require('fs')
  , vfs = require('vinyl-fs')
  , JSZip = require('jszip')
  , async = require('async')
  , _ = require('lodash')
  , lib = require('../mlpm-lib.js')
  , api = require('../api.js')
  , include = [
      '*',
      'docs/**/*',
      'src/**/*',
      'lib/**/*',
      'rest-api/ext/**/*',
      'rest-api/transform/**/*',
      'rest-api/service/**/*'
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
      'npm-debug.log',
      'test',
      'src/test',
      'xray',
      'src/xray'
    ]

function getIgnoreGlobs(cb) {
  async.map(['.mlpmignore', '.gitignore'], function(file, cb) {
    fs.readFile(file, function(err, data) {
      if (err) return cb(null, [])
      cb( null, data.toString().split(/\r?\n/) )
    })
  }, function(err, globs) {
    var ignoreGlobs = _.chain([ignore, globs])
      .flatten()
      .compact()
      .uniq()
      .map(function(line) { return '!' + line; })
      .value()

    cb( null, ignoreGlobs )
  })
}

function getDefaultGlobs(cb) {
  getIgnoreGlobs(function(err, ignoreGlobs) {
    if (err) return cb(err)

    cb( null, include.concat(ignoreGlobs) )
  })
}

function getGlobsFromFiles(files, cb) {
  getIgnoreGlobs(function(err, ignoreGlobs) {
    if (err) return cb(err)

    var globs = [
      'README',
      'README.{md,mdown}',
      'LICENSE',
      'license.txt',
      'mlpm.json'
    ]

    async.map(files, fs.stat, function(err, stats) {
      if (err) return cb(err)

      _.each(stats, function(file, index) {
        var path = files[ index ].replace(/\/$/, '')

        if ( file.isDirectory() ) {
          path += '/**/*'
        }

        globs.push(path)
      })

      cb( null, globs.concat(ignoreGlobs) )
    })
  })
}

function getGlobs(mlpm, cb) {
  if ( mlpm.files && mlpm.files.length ) {
    getGlobsFromFiles( mlpm.files, cb )
  } else {
    getDefaultGlobs(cb)
  }
}

function createZip(mlpm, cb) {
  var zip = new JSZip()

  getGlobs(mlpm, function(err, globs) {
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

function publishPackage(mlpm, auth) {
  createZip(mlpm, function(err, zip) {
    if (err) return console.log(err)

    var buffer = zip.generate({type: 'nodebuffer'})

    api.publish(mlpm, buffer, auth, function(err, body) {
      if (err) return console.log(err)

      console.log( 'published ' + mlpm.name + '@' + mlpm.version )
    })
  })
}

function dryRun() {
  lib.getMlpm(function (err, mlpm) {
    if (err) return console.log(err)

    console.log( mlpm.name + '@' + mlpm.version )
    getGlobs(mlpm, function(err, globs) {
      if (err) return console.log(err)

      var src = vfs.src(globs)
        , cwd = process.cwd()

      src.on('data', function(file) {
        if ( file.stat.isFile() ) {
          console.log( file.path.replace(cwd, '') )
        }
      })

      src.on('error', function(err) {
        console.log(err)
      })
    })
  })
}

function publish(args) {
  if ( args.dryrun ) return dryRun()

  lib.getAuth(args.admin, function(err, auth) {
    if (err) return console.log(err)

    lib.getMlpm(function(err, mlpm) {
      if (err) return console.log(err)

      if ( mlpm.private ) return console.log('private; can\'t publish')

      publishPackage( mlpm, auth )
    })
  })
}

publish.usage = 'mlpm publish [--dry-run]'

module.exports = publish
