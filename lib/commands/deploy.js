'use strict'

var log = require('winston')
var async  = require('async')
var _ = require('lodash')
var prompt = require('prompt')
var path = require('path')
var project = require('../project.js')
var pkgLib = require('../package.js')
var mlDeploy = require('../ml-deploy.js')

function deployPackage(connection, pkg, cb) {
  // TODO: partition into assets/modules && resources/transforms for performance (map vs mapSeries)
  // console.log(_.partition(preparedDeploy, function(deploy) {
  //   return ['resource', 'transform'].indexOf( deploy.type ) === -1
  // }))

  if ( !pkg.preparedDeploy.length ) return cb(new Error('must call pkgLib.parseContents before deployPackage'))

  async.mapSeries(
    pkg.preparedDeploy,
    function(deploy, callback) {
      var moduleLocation = null

      if ( deploy.ns && deploy.type === 'module' ) {
        moduleLocation = _.pick(deploy, 'ns', 'location')
      }

      mlDeploy.deployAsset(connection, deploy, function(err) {
        if (err) return callback(err)
        callback(null, moduleLocation)
      })
    },
    function(err, moduleLocations) {
      if (err) return cb(err)

      log.info('  ' + pkg.name)
      cb(null, _.compact(moduleLocations))
    })
}

function deployPackages(connection, packages, cb) {
  log.info('deploying packages ...')

  var deployCallback = function(pkg, callback) {
    return deployPackage(connection, pkg, callback)
  }

  async.map(packages, pkgLib.parseContents, function(err, packages) {
    async.mapSeries( packages, deployCallback, cb )
  })
}

function dryRun(cb) {
  project.getPackages(function(err, packages) {
    if (err) return cb(err)

    async.map(packages, pkgLib.parseContents, function(err, packages) {
      if (err) return cb(err)

      _.each(packages, function(pkg, idx) {
        var assetPrefix = path.resolve('mlpm_modules', pkg.name).replace(process.cwd() + path.sep, '') + path.sep
          , lastPkg = idx + 1 === packages.length
          , groups = _.groupBy(pkg.preparedDeploy, 'type')
          , types = _.keys(groups)

        log.info( project.symbols.pkg + pkg.name + '@' + pkg.version )

        _.each(types, function(type, idx) {
          var group = groups[ type ]
            , lastGroup = idx + 1 === types.length
            , symbol = project.symbols.pipe

          if ( group.length > 1 ) {
            log.info( project.symbols.pipe + '  ' + group[0].type + 's:' )

            _.each(group, function(asset, assetIdx) {
              if ( lastPkg && lastGroup && assetIdx + 1 === group.length ) {
                symbol = project.symbols.last
              }

              log.info( symbol + '    ' + asset.relativePath.replace(assetPrefix, '') )
            })
          } else {
            if ( lastPkg && lastGroup ) {
              symbol = project.symbols.last
            }
            log.info( symbol + '  ' + group[0].type + ': ' + group[0].relativePath.replace(assetPrefix, '') )
          }

        })

        cb(null)
      })
    })
  })
}

function getConnection(args, cb) {
  args.host = args.host || 'localhost'
  args.port = args.port || '8000' // TODO: int?

  var connection = _.pick(args, 'host', 'port', 'username', 'password')

  // cthulu
  if ( args.username && args.password ) return cb( null, connection )

  var schema = { properties: {} }

  if ( !args.username ) {
    schema.properties.username = {
      description: 'username',
      message: 'username is required',
      required: true
    }
  }
  if ( !args.password ) {
    schema.properties.password = {
      description: 'password',
      message: 'password is required',
      required: true,
      hidden: true
    }
  }

  prompt.start()
  prompt.get(schema, function (err, result) {
    if (err) return cb(err)

    connection.username = connection.username || result.username
    connection.password = connection.password || result.password

    console.log()
    cb( null, connection )
  })
}

function deploy(args, cb) {
  if ( args.dryrun ) return dryRun(cb)

  getConnection(args, function(err, connection) {
    if (err) return cb(err)

    project.getPackages(function(err, packages) {
      if (err) return cb(err)

      //TODO: if deploy local, packages.push( project config )

      deployPackages(connection, packages, function(err, moduleLocations) {
        if (err) return cb(err)

        // console.log()
        // console.log('registering module namespaces')
        // mlDeploy.registerNamespaces(connection, moduleLocations, function(err) {
        //   if (err) return cb(err)
        //   // console.log(results)
        //   cb(null)
        // })

        cb(null)
      })
    })
  })
}

deploy.usage = 'mlpm deploy --dry-run\n' +
               'mlpm deploy -u <admin-user> -p <admin-password> [-H localhost -P 8000]'

module.exports.command = function(args, cb) {
  deploy(args, cb || function(e) {
    if (e) return log.error(e)
  })
}

module.exports.command.usage = deploy.usage
module.exports._getConnection = getConnection
module.exports._dryRun = dryRun
module.exports._deployPackages = deployPackages
module.exports._deployPackage = deployPackage
