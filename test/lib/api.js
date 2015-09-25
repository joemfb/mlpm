/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var stubbedRequest = sinon.stub()
var api

describe('lib/api', function() {
  before(function() {
    mockery.enable()
  })

  beforeEach(function() {
    mockery.registerMock('request', stubbedRequest)

    mockery.registerAllowable('lodash')
    mockery.registerAllowable('../../lib/api.js', true)

    api = require('../../lib/api.js')
  })

  afterEach(function() {
    stubbedRequest.reset()
    mockery.deregisterAll()
  })

  after(function() {
    mockery.disable()
  })

  it('should exist', function() {
    expect(api).to.not.be.undefined
    expect(Object.keys(api).length).to.be.ok
  })

  it('should parse response', function() {
    var args

    api.responseStatus({ statusCode: 200 }, '{}', function() {
      args = arguments
    })

    expect(args).not.to.be.undefined
    expect(args[0]).to.be.null
    expect(args[1]).not.be.undefined

    args = null
    api.responseStatus({ statusCode: 302, headers: {} }, '{}', function() {
      args = arguments
    })

    expect(args).not.to.be.undefined
    expect(args[0]).not.to.be.undefined
    expect(args[0].message).to.equal('HTTP 302: ')
    expect(args[1]).to.be.undefined

    args = null
    api.responseStatus({ statusCode: 302, headers: { location: '/blah' } }, '{}', function() {
      args = arguments
    })

    expect(args).not.to.be.undefined
    expect(args[0]).not.to.be.undefined
    expect(args[0].message).to.equal('HTTP 302: /blah')
    expect(args[1]).to.be.undefined

    args = null
    api.responseStatus({ statusCode: 404 }, '{}', function() {
      args = arguments
    })

    expect(args).not.to.be.undefined
    expect(args[0]).not.to.be.undefined
    expect(args[0].message).to.equal('HTTP 404: {}')
    expect(args[1]).to.be.undefined
  })

  it('should login', function() {
    api.login('token', null)

    expect(stubbedRequest.calledOnce).to.be.true
    var args = stubbedRequest.args[0][0]

    expect(args.method).to.equal('GET')
    expect(args.url).to.equal('http://registry.demo.marklogic.com/v1/resources/authenticate')
    expect(args.qs['rs:token']).to.equal('token')
  })

  it('should invoke api.login callback', function(done) {
    stubbedRequest.yieldsAsync(null, { statusCode: 200 }, '{}')

    api.login('token', function(err, resp) {
      expect(err).to.be.null
      expect(resp).not.to.be.undefined
      done()
    })
  })

  it('should get package info', function() {
    api.info('my-package', null, null)

    expect(stubbedRequest.calledOnce).to.be.true
    var args = stubbedRequest.args[0][0]

    expect(args.method).to.equal('GET')
    expect(args.url).to.equal('http://registry.demo.marklogic.com/v1/resources/info')
    expect(args.qs['rs:package']).to.equal('my-package')
    expect(args.qs['rs:version']).to.be.undefined
  })

  it('should get package/version info', function() {
    api.info('my-package', '1.0.0', null)

    expect(stubbedRequest.calledOnce).to.be.true
    var args = stubbedRequest.args[0][0]

    expect(args.method).to.equal('GET')
    expect(args.url).to.equal('http://registry.demo.marklogic.com/v1/resources/info')
    expect(args.qs['rs:package']).to.equal('my-package')
    expect(args.qs['rs:version']).to.equal('1.0.0')
  })

  it('should invoke api.get callback', function(done) {
    stubbedRequest.yieldsAsync(null, { statusCode: 200 }, '{}')

    api.info('my-package', '1.0.0', function(err, resp) {
      expect(err).to.be.null
      expect(resp).not.to.be.undefined
      done()
    })
  })

  it('should resolve package deps', function() {
    api.resolve('my-package', null, null)

    expect(stubbedRequest.calledOnce).to.be.true
    var args = stubbedRequest.args[0][0]

    expect(args.method).to.equal('GET')
    expect(args.url).to.equal('http://registry.demo.marklogic.com/v1/resources/resolve')
    expect(args.qs['rs:package']).to.equal('my-package')
    expect(args.qs['rs:version']).to.equal('latest')
  })

  it('should resolve package/version deps', function() {
    api.resolve('my-package', '1.0.0', null)

    expect(stubbedRequest.calledOnce).to.be.true
    var args = stubbedRequest.args[0][0]

    expect(args.method).to.equal('GET')
    expect(args.url).to.equal('http://registry.demo.marklogic.com/v1/resources/resolve')
    expect(args.qs['rs:package']).to.equal('my-package')
    expect(args.qs['rs:version']).to.equal('1.0.0')
  })

  it('should invoke api.resolve callback', function(done) {
    stubbedRequest.yieldsAsync(null, { statusCode: 200 }, '{}')

    api.resolve('my-package', '1.0.0', function(err, resp) {
      expect(err).to.be.null
      expect(resp).not.to.be.undefined
      done()
    })
  })

  it('should get package archive', function() {
    api.get({ package: 'my-package', version: '1.0.0' }, null)

    expect(stubbedRequest.calledOnce).to.be.true
    var args = stubbedRequest.args[0][0]

    expect(args.method).to.equal('GET')
    expect(args.url).to.equal('http://registry.demo.marklogic.com/v1/resources/download')
    expect(args.qs['rs:package']).to.equal('my-package')
    expect(args.qs['rs:version']).to.equal('1.0.0')
    expect(args.encoding).to.be.null
  })

  it('should invoke api.get callback', function(done) {
    stubbedRequest.yieldsAsync(null, { statusCode: 200 }, '{}')

    api.get({ package: 'my-package', version: '1.0.0' }, function(err, resp) {
      expect(err).to.be.null
      expect(resp).not.to.be.undefined
      done()
    })
  })

  it('should invoke api.get callback with error', function(done) {
    stubbedRequest.yieldsAsync(new Error('an error'))

    api.get({ package: 'my-package', version: '1.0.0' }, function(err, resp) {
      expect(err).to.match(/an error/)
      expect(resp).to.be.undefined
      done()
    })
  })

  it('should publish package', function() {
    api.publish({ name: 'my-package', version: '1.0.0' }, new Buffer(''), 'token', null)

    expect(stubbedRequest.calledOnce).to.be.true
    var args = stubbedRequest.args[0][0]

    expect(args.method).to.equal('PUT')
    expect(args.url).to.equal('http://registry.demo.marklogic.com/v1/resources/publish')
    expect(args.qs['rs:package']).to.equal('my-package')
    expect(args.qs['rs:version']).to.equal('1.0.0')
    expect(args.qs['rs:version']).not.to.be.undefined
    expect(args.headers['content-type']).not.to.be.undefined
    expect(args.headers['content-type']).to.equal('application/zip')
    expect(args.headers.authorization).not.to.be.undefined
    expect(args.headers.authorization).to.equal('Token token')
  })

  it('should publish package with basic auth', function() {
    var auth = { user: 'u', pass: 'p' }
    api.publish({ name: 'my-package', version: '1.0.0' }, new Buffer(''), auth, null)

    expect(stubbedRequest.calledOnce).to.be.true
    var args = stubbedRequest.args[0][0]

    expect(args.method).to.equal('PUT')
    expect(args.url).to.equal('http://registry.demo.marklogic.com/v1/resources/publish')
    expect(args.qs['rs:package']).to.equal('my-package')
    expect(args.qs['rs:version']).to.equal('1.0.0')
    expect(args.qs['rs:version']).not.to.be.undefined
    expect(args.auth).to.equal(auth)
    expect(args.headers['content-type']).not.to.be.undefined
    expect(args.headers['content-type']).to.equal('application/zip')
    expect(args.auth).to.equal(auth)
  })

  it('should invoke api.publish callback', function(done) {
    stubbedRequest.yieldsAsync(null, { statusCode: 200 }, '{}')

    api.publish({ name: 'my-package', version: '1.0.0' }, new Buffer(''), 'token', function(err, resp) {
      expect(err).to.be.null
      expect(resp).not.to.be.undefined
      done()
    })
  })

  it('should invoke api.publish callback with error', function(done) {
    stubbedRequest.yieldsAsync(new Error('a different error'))

    api.publish({ name: 'my-package', version: '1.0.0' }, new Buffer(''), 'token', function(err, resp) {
      expect(err).to.match(/a different error/)
      expect(resp).to.be.undefined
      done()
    })
  })

  it('should unpublish package', function() {
    api.unpublish('my-package', '1.0.0', null, 'token', null)

    expect(stubbedRequest.calledOnce).to.be.true
    var args = stubbedRequest.args[0][0]

    expect(args.method).to.equal('DELETE')
    expect(args.url).to.equal('http://registry.demo.marklogic.com/v1/resources/publish')
    expect(args.qs).not.to.be.undefined
    expect(args.qs['rs:package']).to.equal('my-package')
    expect(args.qs['rs:version']).to.equal('1.0.0')
    expect(args.qs['rs:force-delete']).to.be.null
    expect(args.headers).not.to.be.undefined
    expect(args.headers.authorization).to.equal('Token token')
  })

  it('should invoke api.unpublish callback', function(done) {
    stubbedRequest.yieldsAsync(null, { statusCode: 200 }, '{}')

    api.unpublish('my-package', '1.0.0', null, 'token', function(err, resp) {
      expect(err).to.be.null
      expect(resp).not.to.be.undefined
      done()
    })
  })

  it('should search', function() {
    api.search('blah', null)

    expect(stubbedRequest.calledOnce).to.be.true
    var args = stubbedRequest.args[0][0]

    expect(args.method).to.equal('GET')
    expect(args.url).to.equal('http://registry.demo.marklogic.com/v1/search')
    expect(args.qs.q).to.equal('blah')
  })

  it('should invoke api.search callback', function(done) {
    stubbedRequest.yieldsAsync(null, { statusCode: 200 }, '{}')

    api.search('blah', function(err, resp) {
      expect(err).to.be.null
      expect(resp).not.to.be.undefined
      done()
    })
  })

  it('should invoke api.search callback with err', function(done) {
    stubbedRequest.yieldsAsync(new Error('timeout'))

    api.search('blah', function(err, resp) {
      expect(err).not.to.be.null
      expect(err.message).to.match(/timeout/)
      done()
    })
  })

  it('should invoke api.search callback with invalid json err', function(done) {
    stubbedRequest.yieldsAsync(null, { statusCode: 200 }, '{ key }')

    api.search('blah', function(err, resp) {
      expect(err).not.to.be.null
      expect(err.message).to.match(/Unexpected token k/)
      done()
    })
  })
})
