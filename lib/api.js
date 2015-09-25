'use strict'

var request = require('request')
  , _ = require('lodash')
  , opt = { registry: 'http://registry.demo.marklogic.com' }

function responseStatus(response, body, cb) {
  var first = parseInt( response.statusCode.toString()[0] )

  switch(first) {
    case 2:
      cb(null, body)
      break
    case 3:
      cb(new Error('HTTP ' + response.statusCode + ': ' + (response.headers.location || '')))
      break
    default:
      cb(new Error('HTTP ' + response.statusCode + ': ' + body))
  }
}

function json(url, params, cb) {
  request({
    method: 'GET',
    url: url,
    qs: params
  }, function (error, response, body) {
    if (error) return cb(error)

    try { var json = JSON.parse(body) }
    catch (err) { return cb(err) }

    responseStatus(response, json, cb)
  })
}

function login(token, cb) {
  var url = opt.registry + '/v1/resources/authenticate'
    , params = { 'rs:token': token }

  json(url, params, cb)
}

function info(name, version, cb) {
  var url = opt.registry + '/v1/resources/info'
    , params = { 'rs:package': name }

  if (version) {
    params['rs:version'] = version
  }

  json(url, params, cb)
}

function resolve(name, version, cb) {
  var url = opt.registry + '/v1/resources/resolve'
    , params = {
        'rs:package': name,
        'rs:version': version || 'latest'
      }

  json(url, params, cb)
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

    responseStatus(response, body, cb)
  })
}

function configAuth(config, auth) {
  if ( _.isObject(auth) ) {
    config.auth = auth
  } else {
    config.headers = config.headers || {}
    config.headers.authorization = 'Token ' + auth
  }
}

function publish(data, buffer, auth, cb) {
  var config = {
    method : 'PUT',
    headers: { 'content-type': 'application/zip' },
    url: opt.registry + '/v1/resources/publish',
    qs: {
      'rs:package': data.name,
      'rs:version': data.version,
      'rs:sha2sum': data.sha2sum
    },
    body: buffer
  }

  configAuth(config, auth)

  request(config, function(error, response, body) {
    if (error) return cb(error)

    responseStatus(response, body, cb)
  })
}

function unpublish(name, version, forceDeleteAll, auth, cb) {
  var config = {
    method : 'DELETE',
    url: opt.registry + '/v1/resources/publish',
    qs: {
      'rs:package': name,
      'rs:version': version,
      'rs:force-delete': forceDeleteAll
    }
  }

  configAuth(config, auth)

  request(config, function(error, response, body) {
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

  json(url, params, cb)
}

module.exports = {
  login:     login,
  info:      info,
  get:       get,
  resolve:   resolve,
  publish:   publish,
  search:    search,
  unpublish: unpublish,
  responseStatus: responseStatus
}
