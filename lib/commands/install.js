'use strict';

var async  = require('async')
  , _      = require('lodash')
  , api    = require('../api.js')
  , project = require('../project.js')
  , pkgLib = require('../package.js')

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

// long-term TODO: actual semver
function resolveAndInstall(name, version, cb) {
  api.resolve(name, version, function(err, data) {
    if (err) return cb(err)

    var packages = preparePackages(data)
      , installedVersion = data.version

    async.each(packages, function(obj, callback) {
      pkgLib.isInstalled(name, obj.version, function(err, isSaved, pkgConfig) {
        if (err) return cb(err)

        if ( isSaved ) {
          if ( obj.version === pkgConfig.version ) return cb(null, installedVersion)

          // note: object-version is resolved on the server
          if ( obj.version < pkgConfig.version ) {
            //TODO: prompt ?
            console.log('downgrading ' + name + ' from ' + pkgConfig.version + ' to ' + obj.version)
          }
        }

        api.get(obj, function(err, buffer) {
          if (err) return callback(err)

          //TODO: delete package dir if error ?
          pkgLib.install(buffer, obj, callback)
        })
      })
    }, function(err) {
      if (err) return cb(err)

      console.log('installed ' + name + '@' + installedVersion)
      cb(null, installedVersion)
    })
  })
}

function one(mlpm, name, version, save) {
  if (mlpm.name === name) return console.log('can\'t depend on yourself ;)')

  version = (!version || version === 'latest') ? '*' : version

  resolveAndInstall(name, version, function(err, installedVersion) {
    if (err) return console.log(err)

    if (save) {
      project.saveDependency(mlpm, name, installedVersion, function(err) {
        if (err) return console.log(err)
        console.log('saved ' + name + ' to mlpm.json')
      })
    }
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
