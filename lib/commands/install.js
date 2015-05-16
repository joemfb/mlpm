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
  version = (!version || version === 'latest') ? '*' : version

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
            console.log('downgrading ' + pkgConfig.name + ' from ' + pkgConfig.version + ' to ' + obj.version)
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

function all(mlpm) {
  // TODO: async.each ?
  _.forOwn(mlpm.dependencies, function(version, name) {
    resolveAndInstall(name, version, function(err, __) {
      if (err) return console.log(err)
    })
  })
}

function install(args) {
  project.getConfig(function (err, mlpm) {
    if ( err && !args.package )  {
      console.log( 'nothing to install' )
      console.log( install.usage )
      return
    }

    if ( !args.package && mlpm ) return all( mlpm )

    if ( mlpm.name === args.package ) return console.log( 'can\'t depend on yourself ;)' )

    resolveAndInstall(args.package, args.version, function(err, installedVersion) {
      if (err) return console.log(err)

      if ( args.save ) {
        project.saveDependency(mlpm, args.package, installedVersion, function(err) {
          if (err) return console.log(err)
          console.log('saved ' + args.package + ' to mlpm.json')
        })
      }
    })
  })
}

install.usage = 'mlpm install [--save]\n' +
                'mlpm install <package> [--save]\n' +
                'mlpm install <package>@version [--save]'

module.exports = install
