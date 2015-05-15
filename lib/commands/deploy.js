'use strict';

var fs = require('fs')
  , async  = require('async')
  , _ = require('lodash')
  , request = require('request')
  , url = require('url')
  , api = require('../api.js')
  , project = require('../project.js')
  , pkgLib = require('../package.js')

function deployFile(connection, deploy, cb) {
  var endpoint = '/v1' + deploy.location
    , contentType = 'text/plain'

  if ( deploy.type === 'resource' ) {
    endpoint = '/v1/config/resources/' + deploy.name
  } else if ( deploy.type === 'transform' ) {
    endpoint = '/v1/config/transforms/' + deploy.name
  }

  if ( deploy.format === 'xqy' ) {
    contentType = 'application/xquery'
  } else if ( deploy.format === 'sjs' ) {
    contentType = 'application/vnd.marklogic-javascript'
  }
  // TODO: binary

  var config = {
    headers: { 'content-type': contentType },
    url: url.format({
      protocol: 'http:',
      port: connection.port,
      hostname: connection.host,
      pathname: endpoint
    }),
    auth: {
      user: connection.username,
      pass: connection.password,
      sendImmediately: false
    },
    // ugh
    body: fs.readFileSync( deploy.path, { encoding: 'utf-8' } )
  }

  // TODO: beats the crap out of me ...
  // fs.createReadStream( deploy.path, { encoding: 'utf-8' } ).pipe(

    request.put(config, function(err, response, body) {
      if (err) return cb(err)

      api.responseStatus(response, body, cb)
    })
  // )
}

function deployPackage(connection, pkg, cb) {
  // TODO: partition into assets/modules && resources/transforms for performance (map vs mapSeries)
  // console.log(_.partition(preparedDeploy, function(deploy) {
  //   return ['resource', 'transform'].indexOf( deploy.type ) === -1
  // }))

  if ( !pkg.preparedDeploy.length ) return cb(new Error('must call pkgLib.parseContents before deployPackage'))

  async.map(
    pkg.preparedDeploy,
    function(deploy, callback) {
      var moduleLocation = null

      if ( deploy.ns && deploy.type === 'module' ) {
        moduleLocation = _.pick(deploy, 'ns', 'location')
      }

      deployFile(connection, deploy, function(err) {
        if (err) return callback(err)
        callback(null, moduleLocation)
      })
    },
    function(err, moduleLocations) {
      if (err) return cb(err)

      console.log('  ' + pkg.name)
      cb(null, _.compact(moduleLocations))
    })
}

function deployPackages(connection, packages, cb) {
  console.log('deploying packages ...')

  var deployCallback = function(pkg, callback) {
    return deployPackage(connection, pkg, callback)
  }

  async.map(packages, pkgLib.parseContents, function(err, packages) {
    async.mapSeries( packages, deployCallback, cb )
  })
}

// function registerNamespaces(connection, locations, cb) {
//   return cb(new Error('not implemented'))
//   // TODO: validate locations

// TODO: fail early?
// detect v7: /v1/config/properties/error-format

//   var auth = {
//     user: connection.username,
//     pass: connection.password,
//     sendImmediately: false
//   }
//   function manageEndpoint(endpoint) {
//     return url.format({
//       protocol: 'http:',
//       port: 8002,
//       hostname: connection.host,
//       pathname: endpoint
//     })
//   }

//   request.get( manageEndpoint('/v1/rest-apis'), {
//       json: true,
//       auth: auth
//     },
//     function(err, response, body) {
//       var server = _.filter(body['rest-apis'], function(instance) {
//         return instance.port === String(connection.port)
//       })[0]

//       if (!server) return cb(new Error('no server for port ' + connection.port))

//       var config = _.pick(server, 'name', 'group')
//       var payloads = _.map(_.flatten(locations), function(location) {
//         return {
//           'module-location': {
//             'namespace-uri': location.ns,
//             location: location.location
//           }
//         }
//       })

//       request.get(manageEndpoint('/manage/v2/servers/' + config.name + '/properties'), {
//           json: true,
//           auth: auth,
//           qs: { 'group-id': config.group }
//         },
//         function(err, response, body) {
//           // if (err) return callback(err)

//           console.log( body )
//           console.log( response.statusCode )
//         })

//       // TODO: manage API bug ?
//       // only supports one payload; then overwrites ...

//       // async.each(payloads,
//       //   function(payload, callback) {
//       //     request.put(manageEndpoint('/manage/v2/servers/' + config.name + '/properties'), {
//       //         json: { 'module-locations': payload },
//       //         auth: auth,
//       //         qs: { 'group-id': config.group }
//       //       },
//       //       function(err, response, body) {
//       //         if (err) return callback(err)

//       //         console.log( body )
//       //         console.log( response.statusCode )
//       //         callback(null, response.statusCode)
//       //       })

//       //   }, function(err, results) {
//       //     if (err) return cb(err)

//       //     console.log(results)
//       //     // cb(null, results)
//       //   })
//     })
// }

function dryRun() {
  project.getPackages(function(err, packages) {
    if (err) return console.log(err)

    async.map(packages, pkgLib.parseContents, function(err, packages) {
      if (err) return console.log(err)

      _.each(packages, function(pkg, idx) {
        var assetPrefix = 'mlpm_modules/' + pkg.name + '/'
          , lastPkg = idx + 1 === packages.length
          , groups = _.groupBy(pkg.preparedDeploy, 'type')
          , types = _.keys(groups)

        console.log( project.symbols.pkg + pkg.name + '@' + pkg.version )

        _.each(types, function(type, idx) {
          var group = groups[ type ]
            , lastGroup = idx + 1 === types.length
            , symbol = project.symbols.pipe

          if ( group.length > 1 ) {
            console.log( project.symbols.pipe + '  ' + group[0].type + 's:' )

            _.each(group, function(asset, assetIdx) {
              if ( lastPkg && lastGroup && assetIdx + 1 === group.length ) {
                symbol = project.symbols.last
              }

              console.log( symbol + '    ' + asset.relativePath.replace(assetPrefix, '') )
            })
          } else {
            if ( lastPkg && lastGroup ) {
              symbol = project.symbols.last
            }
            console.log( symbol + '  ' + group[0].type + ': ' + group[0].relativePath.replace(assetPrefix, '') )
          }

        })
      })
    })
  })
}

function deploy(args) {
  if ( args.dryrun ) return dryRun()

  args.host = args.host || 'localhost'
  args.port = args.port || '8000'

  if ( !args.username ) {
    console.log( 'missing required parameter: username [u]' )
    console.log( deploy.usage )
    return
  }

  // TODO: prompt
  if ( !args.password ) {
    console.log( 'missing required parameter: password [p]' )
    console.log( deploy.usage )
    return
  }

  var connection = _.pick(args, 'host', 'port', 'username', 'password')

  project.getPackages(function(err, packages) {
    if (err) return console.log(err)

    //TODO: if deploy local, packages.push( project config )

    deployPackages(connection, packages, function(err, moduleLocations) {
      if (err) return console.log(err)

      // console.log()
      // console.log('registering module namespaces')
      // registerNamespaces(connection, moduleLocations, function(err) {
      //   if (err) return cb(err)
      //   // console.log(results)
      // })
    })
  })
}

deploy.usage = 'mlpm deploy --dry-run\n' +
               'mlpm deploy -u <admin-user> -p <admin-password> [-H localhost -P 8000]'

module.exports = deploy
