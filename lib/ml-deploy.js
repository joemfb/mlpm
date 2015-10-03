'use strict'

// var log = require('winston')
var fs = require('fs')
var request = require('request')
var url = require('url')
var api = require('./api.js')

function deployAsset(connection, deploy, cb) {
  var endpoint, contentType

  switch (deploy.type) {
    case 'resource':
      endpoint = '/v1/config/resources/' + deploy.name
      break
    case 'transform':
      endpoint = '/v1/config/transforms/' + deploy.name
      break
    default:
      // TODO: validate deploy.location
      endpoint = '/v1' + deploy.location
  }

  // if ( deploy.type === 'resource' ) {
  //   endpoint = '/v1/config/resources/' + deploy.name
  // } else if ( deploy.type === 'transform' ) {
  //   endpoint = '/v1/config/transforms/' + deploy.name
  // }

  switch (deploy.format) {
    case 'xqy':
      contentType = 'application/xquery'
      break
    case 'sjs':
      contentType = 'application/vnd.marklogic-javascript'
      break
    // TODO: binary?
    default:
      contentType = 'text/plain'
  }

  // if ( deploy.format === 'xqy' ) {
  //   contentType = 'application/xquery'
  // } else if ( deploy.format === 'sjs' ) {
  //   contentType = 'application/vnd.marklogic-javascript'
  // }

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

module.exports = {
  deployAsset: deployAsset
}
