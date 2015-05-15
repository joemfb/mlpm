'use strict';

var fs = require('fs')
  , vfs = require('vinyl-fs')
  , JSZip = require('jszip')
  , concat = require('concat-stream')
  , toposort = require('toposort')
  , async  = require('async')
  , _ = require('lodash')
  , path = require('path')
  , slash = require('slash')
  , util = require('./util.js')

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
  , symbols = {
      pkg: '├── ',
      pipe: '│   ',
      last: '└── '
    }

function getConfig(cb) {
  util.readJson('mlpm.json', cb)
}

function saveConfig(data, cb) {
  util.writeJson('mlpm.json', data, cb)
}

//shamelessly taken from https://github.com/npm/init-package-json/blob/master/default-input.js
function getRepository(cb) {
  fs.readFile('.git/config', 'utf8', function(err, gconf) {
    if (err) return cb(err)

    var u, i
    gconf = gconf.split(/\r?\n/)
    i = gconf.indexOf('[remote "origin"]')
    if (i !== -1) {
      u = gconf[i + 1]
      if (!u.match(/^\s*url =/)) u = gconf[i + 2]
      if (!u.match(/^\s*url =/)) u = null
      else u = u.replace(/^\s*url = /, '')
    }
    if (u && u.match(/^git@github.com:/))
      u = u.replace(/^git@github.com:/, 'https://github.com/')

    cb(null, u)
  })
}

function getDefaultConfig(pkgConfig, cb) {
  if (pkgConfig) {
    cb(null, _.pick(pkgConfig, 'name', 'version', 'description', 'repository'))
  } else {
    getRepository(function(err, repository) {
      // ignore err
      cb(null, {
        name: path.basename( process.cwd() ),
        version: '1.0.0',
        repository: repository
      })
    })
  }
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

function deleteDependency(pkgConfig, name, cb) {
  // TODO: check if exists?
  delete pkgConfig.dependencies[name]

  saveConfig(pkgConfig, cb)
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

//TODO: replace with byline and concat
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

    // TODO: sync with defaultExcludes in package.getFiles()
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

    function normalizePath(file) {
      var relative = file.path.replace( process.cwd(), '' )
      return slash( relative ).replace(/^\//, '')
    }

    _.each(files, function(file) {
      zip.file( normalizePath(file), file.contents )
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
  getRepository: getRepository,
  getDefaultConfig: getDefaultConfig,
  saveDependency: saveDependency,
  deleteDependency: deleteDependency,
  getPackages: getPackages,
  getFiles: getFiles,
  createZip: createZip,
  symbols: symbols
}
