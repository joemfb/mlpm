'use strict';

var fs = require('fs')
  , path = require('path')
  , vfs = require('vinyl-fs')
  , async  = require('async')
  , concat = require('concat-stream')
  , byline = require('byline')
  , toposort = require('toposort')
  , _ = require('lodash')
  , request = require('request')
  , url = require('url')
  , api = require('../api.js')
  , cwd = process.cwd()
  , resourceNs = 'http://marklogic.com/rest-api/resource/'
  , transformNs = 'http://marklogic.com/rest-api/resource/'
  , moduleRegex = /^\s*module\s+namespace\s+[^\s=]+\s*=\s*"(.+)";\s*$/ // TODO: NCName regex for prefix
  , defaultExcludes = [
      '/**/mlpm.json',
      '/**/CHANGELOG.md',
      '/**/README.md',
      '/**/README.mdown',
      '/**/LICENSE'
    ]

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

function readByLine(path, cb) {
  var fileStream = fs.createReadStream(path, { encoding: 'utf-8' })
    , lineStream = byline.createStream(fileStream)

  lineStream.on('data', function(line) {
    lineStream.pause()
    cb(line,
      function() { lineStream.resume() },
      function() { fileStream.destroy() })
  })
}

function xqyMetadata(path, cb) {
  var data = {}

  readByLine(path, function(line, resume, close) {
    // path is a main module if we've reached a namespace/variable/function declaration *before* a module declaration
    if ( /^\s*declare/.test( line ) || /^\s*for\s/.test( line ) || /^\s*let\s/.test( line ) ) {
      close()
      return cb(null, null)
    }

    if ( /^\s*module/.test( line ) ) {
      close()
      data.type = 'module'
      // TODO: try/catch
      data.ns = moduleRegex.exec( line )[1]

      if ( data.ns.indexOf( resourceNs ) > -1 ) {
        data.type = 'resource'
        data.name = data.ns.substring( data.ns.indexOf( resourceNs ) + resourceNs.length )
      } else if ( data.ns.indexOf( transformNs ) > -1 ) {
        data.type = 'transform'
        data.name = data.ns.substring( data.ns.indexOf( transformNs ) + transformNs.length )
      }

      return cb(null, data)
    }

    resume()
  })
}

function formatFromPath(path) {
  var format = 'txt'
    , extension = null

  if ( /\.[^\s\/]+$/.test( path ) ) {
    extension = /\.([^\s\/]+)$/.exec( path )[1]

    if ( ['xq', 'xqy', 'xql', 'xqm'].indexOf( extension ) > -1 ) {
      format = 'xqy'
    } else {
      format = extension
    }
  }

  return format
}

function getFileMetadata(path, deploy, cb) {
  var metadata = {
    type: 'asset',
    path: path,
    format: formatFromPath(path),
    location: '/ext' + path.replace(cwd, '')
  }

  if ( !/^\/ext\/mlpm_modules/.test( metadata.location ) ) return cb(new Error('WTF!'))

  deploy = deploy || {}
  _.assign(metadata, deploy)

  var skipXqyCondition = false

  // TODO: confirm that metadata is valid without inspecting the file (performance enhancement)
  // ( metadata.format === 'xqy' ) ?
  // _.contains(['transform', 'resource'], data.type) && data.name

  if ( metadata.format === 'xqy' && !skipXqyCondition ) {
    return xqyMetadata(path, function(err, extractedMetadata) {
      if (err) return cb(err)

      if ( extractedMetadata ) {
        _.assign(metadata, extractedMetadata)
      }

      cb(null, metadata)
    })
  } else {
    process.nextTick(function() { cb(null, metadata) })
  }
}

function getPackageFiles(pkg, excludes, cb) {
  var path = './mlpm_modules/' + pkg.name
    , globs = [ path + '/**/*' ]

  if ( !cb ) {
    cb = excludes
    excludes = []
  }

  _.chain(defaultExcludes)
  .union(excludes)
  .each(function(exclude) {
    globs.push( '!' + path + exclude )
  })
  .run()

  var src = vfs.src(globs)

  src.on('error', cb)

  src.pipe(concat(function(files) {
    cb(null, _.chain(files)
      .filter(function(file) { return file.stat.isFile() })
      .map(function(file) { return file.path })
      .value()
    )
  }))
}

function parseDeployConfig(pkg) {
  var results = {}

  function absolutePath(relativePath) {
    return path.resolve('./mlpm_modules/' + pkg.name, relativePath)
  }

  if ( _.isArray( pkg.deploy ) && _.every( pkg.deploy, _.isObject ) ) {
    _.each( pkg.deploy, function(value) {
      var absPath = absolutePath( value.file )
      value.path = absPath
      results[ absPath ] = value
    })
  } else if ( _.isObject( pkg.deploy ) ) {
    _.each( pkg.deploy, function(value, file) {
      var absPath = absolutePath( file )
        , data = { path: absPath }

      if ( _.isObject(value) ) {
        _.assign(data, value)
      } else {
        data.type = value
      }

      results[ absPath ] = data
    })
  } else {
    // TODO: enable this ?
    // if ( _.isArray(pkg.deploy) && _.every(pkg.deploy, _.isString) )
    throw new Error('invalid deploy config')
  }

  return results
}

function preparePackage(pkg, cb) {
  getPackageFiles(pkg, function(err, paths) {
    if (err) return cb(err)

    var deploy = pkg.deploy ? parseDeployConfig(pkg) : {}

    async.map(paths,
      function(path, callback) {
        getFileMetadata(path, deploy[path], callback)
      },
      function(err, preparedDeploy) {
        if (err) return cb(err)

        pkg.preparedDeploy = _.sortBy(preparedDeploy, function(deploy) {
          var idx = ['resource', 'transform'].indexOf( deploy.type )
          return idx > -1 ? preparedDeploy.length : idx
        })

        cb(null, pkg)
      })
  })
}

function preparePackages(packages, cb) {
  async.map(packages, preparePackage, cb)
}

function deployPackage(connection, pkg, cb) {
  // TODO: partition into assets/modules && resources/transforms for performance (map vs mapSeries)
  // console.log(_.partition(preparedDeploy, function(deploy) {
  //   return ['resource', 'transform'].indexOf( deploy.type ) === -1
  // }))

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

  preparePackages(packages, function(err, packages) {
    async.mapSeries( packages, deployCallback, cb )
  })
}

/* inverse topological sort */
function sortPackages(packages) {
  var sortedNames = _.chain(packages)
    .filter(function(pkg) { return pkg.dependencies })
    .map(function(pkg) {
      return _.map(pkg.dependencies, function(_, dep) { return [dep, pkg.name] })
    })
    .flatten(false)
    .thru(toposort)
    .value()

  return _.sortBy(packages, function(pkg) {
    return sortedNames.indexOf(pkg.name)
  })
}

function getPackages(cb) {
  var src = vfs.src('./mlpm_modules/*/mlpm.json')

  src.on('error', cb)

  src.pipe(concat(function(files) {
    cb(null,
      sortPackages(
        _.map(files, function(file) {
          // TODO try/catch?
          return JSON.parse(file.contents)
        })
      )
    )
  }))
}

// function registerNamespaces(connection, locations, cb) {
//   return cb(new Error('not implemented'))
//   // TODO: validate locations

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

function deploy(args) {
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

  getPackages(function(err, packages) {
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

deploy.usage = 'mlpm deploy -u <admin-user> -p <admin-password> [-H localhost -P 8000]'

module.exports = deploy
