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
  filePath = 'mlpm_modules' + filePath

  mkdirp(path.dirname(filePath), function (err) {
    if (err) return cb(err)
    fs.writeFile(filePath, data, cb)
  })
}

function savePackage(buffer, obj, cb) {
  var zip = new JSZip(buffer)
    , files

  files = _.map(zip.files, function(contents, name) {
    var file = '/' + obj.package + '/' + name
    return { path: file, contents: contents.asText() }
  })

  async.each(files, function(file, callback) {
    saveFile(file.path, file.contents, function(err) {
      callback(err)
    })
  }, function(err) {
    cb(err)
  })
}

function flattenPackages(obj, packages) {
  packages = packages || []
  packages.push( _.pick(obj, ['package', 'version']) )
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

    //TODO: install nested?
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

module.exports = install
