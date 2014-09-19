'use strict';

var request = require('request')
  , qs      = require('querystring')
  , async   = require('async')
  , _       = require('lodash')
  , lib     = require('./mlpm-lib.js')
  , opt

function publishZip(data, buffer) {
  var url = opt.registry + '/v1/resources/publish'
    , params = {
        'rs:package': data.name,
        'rs:version': data.version
      }

  console.log('publishing zip')

  request({
    method : 'PUT',
    url: url + '?' + qs.stringify(params),
    body: buffer,
    auth: opt.auth
  }, function(error, response, body) {
    if (error || response.statusCode !== 200) {
      return console.log(error || response.statusCode)
    } else {
      console.log(body)
      console.log('successfull published package' + data.name)
    }
  })
}


function getPackage(obj, cb) {
  var url = opt.registry + '/v1/resources/download'
    , params = {
        'rs:package': obj.package,
        'rs:version': obj.version
      }

  request({
    method: 'GET',
    url: url + '?' + qs.stringify(params),
    auth: opt.auth,
    encoding: null // return body as a Buffer
  }, function (error, response, body) {
    if (error || response.statusCode !== 200) {
      return cb(error || response.statusCode)
    }
    cb( null, body, obj )
  })
}

function parsePackages(obj, packages) {
  packages = packages || []
  packages.push( _.pick(obj, ['package', 'version']) )
  if (obj.dependencies) {
    _.each( obj.dependencies, function(dependency) {
      parsePackages(dependency, packages)
    })
  }
  return packages
}

function resolveDependencies(name, version, cb) {
  var url = opt.registry + '/v1/resources/resolve'
    , params = {
        'rs:package': name,
        'rs:version': version
      }

  request({
    method: 'GET',
    url: url + '?' + qs.stringify(params),
    auth: opt.auth
  }, function (error, response, body) {
    if (error ||  response.statusCode !== 200) {
      console.log(response.statusCode)
      return cb(error)
    }
    cb( null, JSON.parse(body) )
  })
}

function installAll(name, version, cb) {
  resolveDependencies(name, version, function(err, data) {
    var modules = parsePackages(data)
    if (err) return console.log(err)

    async.each(modules, function(obj, callback) {
      getPackage(obj, lib.installPackage)
      callback()
    }, function(err) {
      if (err) return cb(err)
      cb(null, modules[0].version)
    })
  })
}

function installDependencies(dependencies) {
  _.forIn(dependencies, function(version, dependency) {
    console.log(dependency + ':' + version)
    installAll(dependency, version, function(err) {
      if (err) return console.log(err)
      console.log('installed dependencies for ' + dependency)
    })
  })
}

function saveDependency(name, version) {
  console.log('saving dependency info, yo')
  lib.getMlpm(function (err, data) {
    if (err) return console.log(err)
    data.dependencies[name] = version
    lib.saveMlpm(data, function(err) {
      if (err) {
        console.log(err)
      } else {
        console.log('saved ' + name + ' to mlpm.json')
      }
    })
  })
}

function installNewDependency(name, version, save) {
  installAll(name, version, function(err, version) {
    if (err) return console.log(err)
    if (save) {
      saveDependency(name, version);
    }
  })
}

function info(name, version, cb) {
  var url = opt.registry + '/v1/resources/info'
    , params = { 'rs:package': name }

  if (version) {
    params['rs:version'] = version
  }

  request({
    method: 'GET',
    url: url + '?' + qs.stringify(params),
    auth: opt.auth
  }, function (error, response, body) {
    if (error || response.statusCode !== 200) {
      return cb(error ||  response.statusCode)
    }
    cb( null, JSON.parse(body) )
  })
}

module.exports = function(options) {
  if (!options) return console.log('api.js requires the options parameter!')
  opt = options
  return {
    info:                 info,
    installDependencies:  installDependencies,
    installNewDependency: installNewDependency,
    publishZip:           publishZip
  }
}
