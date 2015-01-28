'use strict';

var fs     = require('fs')
  , path   = require('path')
  , mkdirp = require('mkdirp')
  , JSZip  = require('jszip')
  , async  = require('async')
  , _      = require('lodash')
  , lib    = require('./mlpm-lib.js')
  , api    = require('./api.js')

function saveFile(filePath, data, cb) {
  mkdirp(path.dirname(filePath), function (err) {
    if (err) return cb(err)
    fs.writeFile(filePath, data, cb)
  })
}

function makePath(dir, filePath) {
  var saveNested = false
    , fullPath = ''

  if (saveNested) {
    fullPath = dir + filePath
  } else {
    fullPath = './mlpm_modules' + filePath
  }

  return fullPath
}

function savePackage(buffer, obj, cb) {
  var zip = new JSZip(buffer)
    , files

  files = _.map(zip.files, function(contents, name) {
    var file = '/' + obj.package + '/' + name
    return { path: file, contents: contents.asText() }
  })

  async.each(files, function(file, callback) {
    var filePath = makePath(obj.path, file.path)
    saveFile(filePath, file.contents, callback)
  }, function(err) {
    cb(err)
  })
}

function flattenPackages(obj, packages) {
  packages = packages || []
  packages.push( _.pick(obj, ['package', 'version', 'path']) )
  if (obj.dependencies) {
    _.each( obj.dependencies, function(dependency) {
      flattenPackages(dependency, packages)
    })
  }
  return packages
}

function packageAlreadySaved(name, version, cb) {
  // note: assumes saveNested === true in makePath
  var packagePath = './mlpm_modules/' + name + '/mlpm.json'

  lib.readJson(packagePath, function (err, mlpm) {
    if (err || mlpm.name !== name ) {
      return cb(null, false)
    }

    cb(null, true, mlpm)
  })
}

function resolveAndInstall(name, version, cb) {
  api.resolve(name, version, function(err, data) {
    if (err) return cb(err)

    var modules = flattenPackages(data)
      , installedVersion = data.version

    async.each(modules, function(obj, callback) {
      //TODO: semver (obj.version assumes server-side semver)
      packageAlreadySaved(name, obj.version, function(err, isSaved, mlpm) {
        if (err) return cb(err)

        if (isSaved) {
          if ( obj.version === mlpm.version ) return

          // TODO: semver
          if ( obj.version < mlpm.version ) {
            //TODO: prompt
            console.log('downgrading ' + name + ' from ' + mlpm.version + ' to ' + obj.version)
          }
        }

        api.get(obj, function(err, buffer) {
          if (err) return callback(err)

          //TODO: delete package dir if error ?
          savePackage(buffer, obj, callback)
        })
      })
    }, function(err) {
      if (err) return cb(err)

      console.log('installed ' + name + '@' + installedVersion)
      cb(null, installedVersion)
    })
  })
}

function saveDependency(mlpm, name, version) {
  mlpm.dependencies = mlpm.dependencies || {}
  mlpm.dependencies[ name ] = version
  lib.saveMlpm(mlpm, function(err) {
    if (err) return console.log(err)
    console.log('saved ' + name + ' to mlpm.json')
  })
}

function one(mlpm, name, version, save) {
  if (mlpm.name === name) return console.log('can\'t depend on yourself ;)')

  resolveAndInstall(name, version, function(err, installedVersion) {
    if (err)  return console.log(err)
    if (save) saveDependency(mlpm, name, installedVersion)
  })
}

function all(mlpm) {
  _.forOwn(mlpm.dependencies, function(version, name) {
    one(mlpm, name, version, false)
  })
}

function install(args) {
  lib.getMlpm(function (err, mlpm) {
    if (err) return console.log(err)

    if (args.package) {
      one( mlpm, args.package, args.version, args.save )
    } else {
      all( mlpm )
    }
  })
}

install.usage = 'mlpm install [--save]\n' +
                'mlpm install <package> [--save]\n' +
                'mlpm install <package>@version [--save]'

module.exports = install
