'use strict';

var fs = require('fs')
  , vfs = require('vinyl-fs')
  , JSZip = require('jszip')
  , concat = require('concat-stream')
  , toposort = require('toposort')
  , async  = require('async')
  , _ = require('lodash')
  , util = require('./util.js')
  , pkgLib = require('./package.js')

var include = [
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

function getConfig(cb) {
  util.readJson('mlpm.json', cb)
}

function saveConfig(data, cb) {
  util.writeJson('mlpm.json', data, cb)
}

/* inverse topological sort */
function sortPackages(packages) {
  var sortedNames = _.chain(packages)
    .filter(function(pkg) { return pkg.dependencies })
    .map(function(pkg) {
      return _.map(pkg.dependencies, function(_, dep) { return [dep, pkg.name] })
    })
    .flatten(false)
    .thru(toposort)
    .value()

  return _.sortBy(packages, function(pkg) {
    return sortedNames.indexOf(pkg.name)
  })
}

function getPackages(cb) {
  var src = vfs.src('./mlpm_modules/*/mlpm.json')

  src.on('error', cb)

  src.pipe(concat(function(files) {
    cb(null,
      sortPackages(
        _.map(files, function(file) {
          // TODO try/catch?
          return JSON.parse(file.contents)
        })
      )
    )
  }))
}

function preparePackages(packages, cb) {
  async.map(packages, pkgLib.preparePackage, cb)
}

function saveDependency(pkgConfig, name, version, cb) {
  pkgConfig.dependencies = pkgConfig.dependencies || {}

  // save semver any patch version
  version = /^\d+\.\d+\.\d+$/.test( version ) ?
            version.replace(/\d+$/, '*') :
            version

  pkgConfig.dependencies[ name ] = version
  saveConfig(pkgConfig, cb)
}

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

    // TODO: sync with package.defaultExcludes
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

function getGlobs(pkgConfig, cb) {
  if ( pkgConfig.files && pkgConfig.files.length ) {
    getGlobsFromFiles( pkgConfig.files, cb )
  } else {
    getDefaultGlobs(cb)
  }
}

function getFiles(pkgConfig, readContents, cb) {
  if ( !cb ) {
    cb = readContents
    readContents = true
  }

  getGlobs(pkgConfig, function(err, globs) {
    if (err) return cb(err)

    var src = vfs.src(globs, { read: readContents })

    src.on('error', cb)

    src.pipe(concat(function(files) {
      cb(null, _.filter(files, function(file) {
        return file.stat.isFile()
      }))
    }))
  })
}

function createZip(pkgConfig, cb) {
  getFiles(pkgConfig, function(err, files) {
    if (err) return cb(err)

    var zip = new JSZip()
      , cwd = process.cwd() + '/'

    _.each(files, function(file) {
      zip.file( file.path.replace(cwd, ''), file.contents )
    })

    if ( _.keys( zip.files ).length === 0 ) {
      return cb(new Error('aborting, empty zip'))
    }

    cb( null, zip )
  })
}

module.exports = {
  getConfig: getConfig,
  saveConfig: saveConfig,
  getPackages: getPackages,
  preparePackages: preparePackages,
  saveDependency: saveDependency,
  getFiles: getFiles,
  createZip: createZip
}
