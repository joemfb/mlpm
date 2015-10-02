'use strict'

var log = require('winston')
var async = require('async')
var _ = require('lodash')
var api = require('../api.js')
var project = require('../project.js')
var pkgLib = require('../package.js')

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
      log.info( 'version conflict for ' + duplicate[0].package )
      // TODO: x depends on {version}
      _.each(duplicate, function(dupVersion) {
        log.info( '    ' + dupVersion.version )
      })

      // TODO: prompt for conflict resolution
      log.info( 'installing ' + _.sortByOrder(duplicate, 'version', false)[0].version + '\n')
    })
  }

  return _.sortBy( filteredModules, ['package', 'version'] )
}

// long-term TODO: actual semver
function resolveAndInstall(name, version, cb) {
  version = (!version || version === 'latest') ? '*' : version

  api.resolve(name, version, function(err, data) {
    if (err) return cb(err)

    var packages = preparePackages(data)
      , installedVersion = data.version

    async.each(packages, function(obj, callback) {
      pkgLib.getConfig(obj.package, function(err, pkgConfig) {
        // ignore err

        if ( pkgConfig ) {
          if ( obj.version === pkgConfig.version ) return callback(null)

          // note: object-version is resolved on the server
          if ( obj.version < pkgConfig.version ) {
            //TODO: prompt ?
            log.info('downgrading ' + pkgConfig.name + ' from ' + pkgConfig.version + ' to ' + obj.version)
          }
        }

        api.get(obj, function(err, buffer) {
          if (err) return callback(err)

          pkgLib.install(buffer, obj.package, callback)
        })
      })
    }, function(err) {
      if (err) return cb(err)

      log.info('installed ' + name + '@' + installedVersion)
      cb(null, installedVersion)
    })
  })
}

function all(mlpm) {
  // TODO: async.each ?
  _.forOwn(mlpm.dependencies, function(version, name) {
    resolveAndInstall(name, version, function(err, __) {
      if (err) return log.error(err)
    })
  })
}

function install(args) {
  project.getConfig(function (err, mlpm) {
    if ( err && !args.package )  {
      log.error( 'nothing to install' )
      log.info( install.usage )
      return
    }

    if ( !args.package && mlpm ) return all( mlpm )

    if ( mlpm && mlpm.name === args.package ) return log.error( 'can\'t depend on yourself ;)' )

    resolveAndInstall(args.package, args.version, function(err, installedVersion) {
      if (err) return log.error(err)

      if ( args.save ) {
        project.saveDependency(mlpm, args.package, installedVersion, function(err) {
          if (err) return log.error(err)
          log.info('saved ' + args.package + ' to mlpm.json')
        })
      }
    })
  })
}

install.usage = 'mlpm install [--save]\n' +
                'mlpm install <package> [--save]\n' +
                'mlpm install <package>@version [--save]'

module.exports.command = install
