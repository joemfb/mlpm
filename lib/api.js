'use strict';

var request = require('request')
  , qs      = require('querystring')
  , opt     = {
      registry: 'http://registry.demo.marklogic.com:8094',
      //TODO: setup default credentials in the registry
      readOnlyAuth: {
        user: 'mlpm-registry-user',
        pass: 'K#Xbbr\'OE1py7w`FE>Ai',
        sendImmediately: false
      }
    }

function responseStatus(response, body, cb) {
  var first = parseInt( response.statusCode.toString()[0] )

  switch(first) {
    case 2:
      cb(null, body)
      break
    case 3:
      cb(new Error('HTTP ' + response.statusCode + ': ' + response.headers.location || ''))
      break
    case 4:
      cb(new Error('HTTP ' + response.statusCode + ': ' + body))
      break
    default:
      cb(new Error('unknown: HTTP ' + response.statusCode + ': ' + body))
  }
}

function makeRequest(url, params, cb) {
  request({
    method: 'GET',
    url: url + '?' + qs.stringify(params),
    auth: opt.readOnlyAuth
  }, function (error, response, body) {
    if (error) return cb(error)
    responseStatus(response, body, cb)
  })
}

function info(name, version, cb) {
  var url = opt.registry + '/v1/resources/info'
    , params = { 'rs:package': name }

  if (version) {
    params['rs:version'] = version
  }

  makeRequest(url, params, function(err, body) {
    cb( null, JSON.parse(body) )
  })
}

function resolve(name, version, cb) {
  var url = opt.registry + '/v1/resources/resolve'
    , params = {
        'rs:package': name,
        'rs:version': version
      }

  makeRequest(url, params, function(err, body) {
    cb( null, JSON.parse(body) )
  })
}

function get(obj, cb) {
  var url = opt.registry + '/v1/resources/download'
    , params = {
        'rs:package': obj.package,
        'rs:version': obj.version
      }

  request({
    method: 'GET',
    url: url + '?' + qs.stringify(params),
    auth: opt.readOnlyAuth,
    encoding: null // return body as a Buffer
  }, function(error, response, body) {
    if (error) return cb(error)

    responseStatus(response, body, function(err, body) {
      cb( null, body )
    })
  })
}

function publish(data, buffer, auth, cb) {
  var url = opt.registry + '/v1/resources/publish'
    , params = {
        'rs:package': data.name,
        'rs:version': data.version
      }

  request({
    method : 'PUT',
    url: url + '?' + qs.stringify(params),
    body: buffer,
    auth: auth
  }, function(error, response, body) {
    if (error) return cb(error)

    responseStatus(response, body, cb)
  })
}

module.exports = {
  info:    info,
  get:     get,
  resolve: resolve,
  publish: publish
}
