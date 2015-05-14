'use strict';

var fs     = require('fs')
  , path   = require('path')
  , mkdirp = require('mkdirp')
  , JSZip  = require('jszip')
  , async  = require('async')
  , _      = require('lodash')
  , util   = require('../util.js')
  , api    = require('../api.js')
  , project = require('../project.js')

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

  // TODO delete package directory
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

function preparePackages(data) {
  var modules = flattenPackages(data)

  // filter exact dups
  var filteredModules = _.uniq(modules, function(module) {
    return module.package + module.version
  })

  var duplicates = _.chain(filteredModules)
    .filter(function(module) {
      return _.filter(filteredModules, function(x) {
        return x.package === module.package && x.version !== module.version
      }).length
    })
    .groupBy('package')
    .value()

  if ( _.keys(duplicates).length ) {
    _.each( duplicates, function(duplicate) {
      console.log( 'version conflict for ' + duplicate[0].package )
      // TODO: x depends on {version}
      _.each(duplicate, function(dupVersion) {
        console.log( '    ' + dupVersion.version )
      })

      // TODO: prompt for conflict resolution
      console.log( 'installing ' + _.sortByOrder(duplicate, 'version', false)[0].version )
      console.log()
    })
  }

  return _.sortBy( filteredModules, ['package', 'version'] )
}

function packageAlreadySaved(name, version, cb) {
  // note: assumes saveNested === true in makePath
  var packagePath = './mlpm_modules/' + name + '/mlpm.json'

  util.readJson(packagePath, function (err, mlpm) {
    if (err || mlpm.name !== name ) {
      return cb(null, false)
    }

    cb(null, true, mlpm)
  })
}

// long-term TODO: actual semver
function resolveAndInstall(name, version, cb) {
  api.resolve(name, version, function(err, data) {
    if (err) return cb(err)

    var packages = preparePackages(data)
      , installedVersion = data.version

    async.each(packages, function(obj, callback) {
      packageAlreadySaved(name, obj.version, function(err, isSaved, mlpm) {
        if (err) return cb(err)

        if (isSaved) {
          //TODO, need to somehow (maybe) still save dep to mlpm.json ...
          if ( obj.version === mlpm.version ) return

          // note: object-version is resolved on the server
          if ( obj.version < mlpm.version ) {
            //TODO: prompt ?
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

  // save semver any patch version
  version = /^\d+\.\d+\.\d+$/.test( version ) ?
            version.replace(/\d+$/, '*') :
            version

  mlpm.dependencies[ name ] = version
  project.saveConfig(mlpm, function(err) {
    if (err) return console.log(err)
    console.log('saved ' + name + ' to mlpm.json')
  })
}

function one(mlpm, name, version, save) {
  if (mlpm.name === name) return console.log('can\'t depend on yourself ;)')

  version = (!version || version === 'latest') ? '*' : version

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
  project.getConfig(function (err, mlpm) {
    if (err) mlpm = {}

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
