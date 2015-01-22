'use strict';

var request = require('request')
  // , opt = { registry: 'http://registry.demo.marklogic.com' }
  , opt = { registry: 'http://localhost:8096' }

function responseStatus(response, body, cb) {
  var first = parseInt( response.statusCode.toString()[0] )

  switch(first) {
    case 2:
      cb(null, body)
      break
    case 3:
      cb(new Error('HTTP ' + response.statusCode + ': ' + response.headers.location || ''))
      break
    default:
      cb(new Error('HTTP ' + response.statusCode + ': ' + body))
  }
}

function makeRequest(url, params, cb) {
  request({
    method: 'GET',
    url: url,
    qs: params
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
        'rs:version': version || 'latest'
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
    url: url,
    qs: params,
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
    headers: { 'content-type': 'application/zip' },
    url: url,
    qs: params,
    body: buffer,
    auth: auth
  }, function(error, response, body) {
    if (error) return cb(error)

    responseStatus(response, body, cb)
  })
}

function search(query, cb) {
  var url = opt.registry + '/v1/search'
    , params = {
        q: query,
        format: 'json',
        options: 'cli'
      }

  makeRequest(url, params, function(err, body) {
    cb( null, JSON.parse(body) )
  })
}

module.exports = {
  info:    info,
  get:     get,
  resolve: resolve,
  publish: publish,
  search:  search
}
