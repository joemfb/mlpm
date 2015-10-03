/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var sandbox = sinon.sandbox.create()
var request = { put: sandbox.stub() }
var fs = { readFileSync: sandbox.stub() }
var connection = {
  username: 'u',
  password: 'p',
  host: 'localhost',
  port: '8000'
}
var mlDeploy

describe('lib/ml-deploy', function() {
  before(function() {
    mockery.enable()
  })

  beforeEach(function() {
    mockery.registerMock('fs', fs)
    mockery.registerMock('request', request)
    mockery.registerAllowables(['lodash', 'url', './api.js'])

    mockery.registerAllowable('../../lib/ml-deploy.js', true)
    mlDeploy = require('../../lib/ml-deploy.js')
  })

  afterEach(function() {
    sandbox.reset()
    mockery.deregisterAll()
  })

  after(function() {
    mockery.disable()
  })

  it('should exist', function() {
    expect(mlDeploy).to.not.be.undefined
    expect(Object.keys(mlDeploy).length).to.be.ok
  })

  it('should handle deploy error', function(done) {
    var asset = {
      format: 'xqy',
      type: 'asset',
      location: '/ext/mlpm_modules/foo/bar.xqy'
    }

    request.put.yieldsAsync(new Error('broken'))

    mlDeploy.deployAsset(connection, asset, function(err) {
      sinon.assert.calledOnce(request.put)
      expect(err).to.match(/broken/)
      done()
    })
  })

  it('should deploy asset', function(done) {
    var asset = {
      format: 'txt',
      type: 'asset',
      location: '/ext/mlpm_modules/foo/bar.txt'
    }

    request.put.yieldsAsync(null, { statusCode: 200 }, '{}')

    mlDeploy.deployAsset(connection, asset, function(err) {
      sinon.assert.calledOnce(fs.readFileSync)
      sinon.assert.calledOnce(request.put)
      var args = request.put.args[0][0]
      expect(args).not.to.undefined
      expect(args.headers).not.to.undefined
      expect(args.headers['content-type']).to.equal('text/plain')
      expect(args.url).to.equal('http://localhost:8000/v1/ext/mlpm_modules/foo/bar.txt')
      expect(args.auth).not.to.undefined
      done()
    })
  })

  it('should deploy REST resource', function(done) {
    var asset = {
      name: 'bar',
      format: 'xqy',
      type: 'resource'
    }

    request.put.yieldsAsync(null, { statusCode: 200 }, '{}')

    mlDeploy.deployAsset(connection, asset, function(err) {
      sinon.assert.calledOnce(fs.readFileSync)
      sinon.assert.calledOnce(request.put)
      var args = request.put.args[0][0]
      expect(args).not.to.undefined
      expect(args.headers).not.to.undefined
      expect(args.headers['content-type']).to.equal('application/xquery')
      expect(args.url).to.equal('http://localhost:8000/v1/config/resources/bar')
      done()
    })
  })

  it('should deploy REST transform', function(done) {
    var asset = {
      name: 'baz',
      format: 'sjs',
      type: 'transform'
    }

    request.put.yieldsAsync(null, { statusCode: 200 }, '{}')

    mlDeploy.deployAsset(connection, asset, function(err) {
      sinon.assert.calledOnce(fs.readFileSync)
      sinon.assert.calledOnce(request.put)
      var args = request.put.args[0][0]
      expect(args).not.to.undefined
      expect(args.headers).not.to.undefined
      expect(args.headers['content-type']).to.equal('application/vnd.marklogic-javascript')
      expect(args.url).to.equal('http://localhost:8000/v1/config/transforms/baz')
      done()
    })
  })
})
