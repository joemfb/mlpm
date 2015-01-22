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

function resolveAndInstall(name, version, cb) {
  api.resolve(name, version, function(err, data) {
    if (err) return cb(err)

    var modules = flattenPackages(data)

    async.each(modules, function(obj, callback) {
      api.get(obj, function(err, buffer) {
        if (err) return callback(err)
        savePackage(buffer, obj, callback)
      })
    }, function(err) {
      if (err) return cb(err)
      console.log('installed ' + name + '@' + version)
      cb(null, modules[0].version)
    })
  })
}

function saveDependency(name, version) {
  lib.getMlpm(function (err, mlpm) {
    if (err) return console.log(err)
    if (mlpm.name === name) return console.log('can\'t depend on yourself ;)')

    mlpm.dependencies[name] = version
    lib.saveMlpm(mlpm, function(err) {
      if (err) return console.log(err)
      console.log('saved ' + name + ' to mlpm.json')
    })
  })
}

function one(name, version, save) {
  resolveAndInstall(name, version, function(err, version) {
    if (err)  return console.log(err)
    if (save) saveDependency(name, version)
  })
}

function all(dependencies) {
  lib.getMlpm(function (err, mlpm) {
    if (err) return console.log(err)

    _.forOwn(mlpm.dependencies, function(version, name) {
      one(name, version)
    })
  })
}

function install(args) {
  if (args.package) {
    one(args.package, args.version, args.save)
  } else {
    all()
  }
}

install.usage = 'mlpm install [--save]\n' +
                'mlpm install <package> [--save]\n' +
                'mlpm install <package>@version [--save]\n'

module.exports = install
