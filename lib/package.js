'use strict';

var fs = require('fs')
  , path = require('path')
  , slash = require('slash')
  , vfs = require('vinyl-fs')
  , concat = require('concat-stream')
  , async  = require('async')
  , _ = require('lodash')
  , mkdirp = require('mkdirp')
  , JSZip  = require('jszip')
  , rimraf = require('rimraf')
  , util = require('./util.js')

function xqyMetadata(filePath, cb) {
  var resourceNs = 'http://marklogic.com/rest-api/resource/'
    , transformNs = 'http://marklogic.com/rest-api/transform/'
    , moduleRegex = /^\s*module\s+namespace\s+[^\s=]+\s*=\s*"(.+)";\s*$/ // TODO: NCName regex for prefix
    , data = {}

  util.readByLine(filePath, function(line, resume, close) {
    // filePath is a main module if we've reached a namespace/variable/function declaration *before* a module declaration
    if ( /^\s*declare/.test( line ) || /^\s*for\s/.test( line ) || /^\s*let\s/.test( line ) ) {
      close()
      return cb(null, null)
    }

    if ( /^\s*module/.test( line ) ) {
      close()
      data.type = 'module'
      // TODO: try/catch
      data.ns = moduleRegex.exec( line )[1]

      if ( data.ns.indexOf( resourceNs ) > -1 ) {
        data.type = 'resource'
        data.name = data.ns.substring( data.ns.indexOf( resourceNs ) + resourceNs.length )
      } else if ( data.ns.indexOf( transformNs ) > -1 ) {
        data.type = 'transform'
        data.name = data.ns.substring( data.ns.indexOf( transformNs ) + transformNs.length )
      }

      return cb(null, data)
    }

    resume()
  })
}

function formatFromPath(filePath) {
  var format = 'txt'
    , extension = null

  if ( /\.[^\s\/]+$/.test( filePath ) ) {
    extension = /\.([^\s\/]+)$/.exec( filePath )[1]

    if ( ['xq', 'xqy', 'xql', 'xqm'].indexOf( extension ) > -1 ) {
      format = 'xqy'
    } else {
      format = extension
    }
  }

  return format
}

function getFileMetadata(filePath, deploy, cb) {
  var relativePath = filePath.replace(process.cwd() + path.sep, '')
    , metadata = {
        type: 'asset',
        path: filePath,
        relativePath: relativePath,
        format: formatFromPath(filePath),
        location: '/ext/' + slash(relativePath)
      }

  // cthulu
  if ( !/^mlpm_modules/.test( metadata.relativePath ) ) return cb(
    new Error('Path parsing error: ' + JSON.stringify(metadata))
  )

  deploy = deploy || {}
  _.assign(metadata, deploy)

  var skipXqyCondition = false

  // TODO: confirm that metadata is valid without inspecting the file (performance enhancement)
  // ( metadata.format === 'xqy' ) ?
  // _.contains(['transform', 'resource'], data.type) && data.name

  if ( metadata.format === 'xqy' && !skipXqyCondition ) {
    return xqyMetadata(filePath, function(err, extractedMetadata) {
      if (err) return cb(err)

      cb(null, _.assign(metadata, extractedMetadata))
    })
  } else {
    process.nextTick(function() { cb(null, metadata) })
  }
}

function getFiles(name, excludes, cb) {
  var filePath = './mlpm_modules/' + name // path.resolve('mlpm_modules', name)
    , globs = [ filePath + '/**/*' ]

  if ( !cb ) {
    cb = excludes
    excludes = []
  }

  var defaultExcludes = [
    '/**/mlpm.json',
    '/**/CHANGELOG.md',
    '/**/README.md',
    '/**/README.mdown',
    '/**/LICENSE'
  ]

  _.chain(defaultExcludes)
  .union(excludes)
  .each(function(exclude) {
    globs.push( '!' + filePath + exclude )
  })
  .run()

  var src = vfs.src(globs, { read: false })

  src.on('error', cb)

  src.pipe(concat(function(files) {
    cb(null, _.chain(files)
      .filter(function(file) { return file.stat.isFile() })
      .map(function(file) { return file.path })
      .value()
    )
  }))
}

function parseDeployConfig(pkg) {
  var results = {}

  // TODO: capture relative path
  function absolutePath(relativePath) {
    return path.resolve('./mlpm_modules/' + pkg.name, relativePath)
  }

  if ( _.isArray( pkg.deploy ) && _.every( pkg.deploy, _.isObject ) ) {
    _.each( pkg.deploy, function(value) {
      var absPath = absolutePath( value.file )
      value.path = absPath
      results[ absPath ] = value
    })
  } else if ( _.isObject( pkg.deploy ) && !_.isArray( pkg.deploy ) ) {
    _.each( pkg.deploy, function(value, file) {
      var absPath = absolutePath( file )
        , data = { path: absPath }

      if ( _.isObject(value) ) {
        _.assign(data, value)
      } else {
        data.type = value
      }

      results[ absPath ] = data
    })
  } else {
    // TODO: enable this ?
    // if ( _.isArray(pkg.deploy) && _.every(pkg.deploy, _.isString) )
    throw new Error('invalid deploy config')
  }

  return results
}

function parseContents(pkg, cb) {
  getFiles(pkg.name, function(err, paths) {
    if (err) return cb(err)

    var deploy = {}

    if ( pkg.deploy ) {
      try {
        deploy = parseDeployConfig(pkg)
      } catch(err) {
        return cb(err)
      }
    }

    async.map(paths,
      function(filePath, callback) {
        getFileMetadata(filePath, deploy[filePath], callback)
      },
      function(err, preparedDeploy) {
        if (err) return cb(err)

        pkg.preparedDeploy = _.sortBy(preparedDeploy, function(deploy) {
          var idx = ['resource', 'transform'].indexOf( deploy.type )
          return idx > -1 ? preparedDeploy.length : idx
        })

        cb(null, pkg)
      })
  })
}

function isInstalled(name, version, cb) {
  var packagePath = './mlpm_modules/' + name + '/mlpm.json'

  util.readJson(packagePath, function (err, pkgConfig) {
    if (err || pkgConfig.name !== name ) {
      return cb(null, false)
    }

    cb(null, true, pkgConfig)
  })
}

function saveFile(filePath, data, cb) {
  mkdirp(path.dirname(filePath), function (err) {
    if (err) return cb(err)
    fs.writeFile(filePath, data, cb)
  })
}

function install(buffer, pkgName, cb) {
  var zip = new JSZip(buffer)

  var files = _.map(zip.files, function(contents, name) {
    return { path: name, contents: contents.asText() }
  })

  uninstall(pkgName, function(err) {
    //TODO: handle err?

    async.each(
      files,
      function(file, callback) {
        var filePath = path.resolve( 'mlpm_modules', pkgName, file.path )
        saveFile(filePath, file.contents, callback)
      },
      function(err) {
        if (err) return uninstall( pkgName, _.bind(cb, null, err) )

        cb(null)
      })
  })
}

function uninstall(name, cb) {
  rimraf( path.resolve('mlpm_modules', name), cb )
}

module.exports = {
  xqyMetadata: xqyMetadata,
  formatFromPath: formatFromPath,
  getFileMetadata: getFileMetadata,
  getFiles: getFiles,
  parseDeployConfig: parseDeployConfig,
  parseContents: parseContents,
  isInstalled: isInstalled,
  install: install,
  uninstall: uninstall
}
