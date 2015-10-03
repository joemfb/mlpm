/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var sandbox = sinon.sandbox.create()
var fs = { readFileSync: sandbox.stub() }
var api = { responseStatus: sandbox.stub() }
var request = {
  put: sandbox.stub()
}
var prompt = {
  start: sandbox.stub(),
  get: sandbox.stub()
}
var pkgLib = { parseContents: sandbox.stub() }
var mlDeploy = { deployAsset: sandbox.stub() }
var project = {
  getPackages: sandbox.stub(),
  symbols: {
    pkg: '|',
    pipe: '|',
    last: '_'
  }
}
var log = {
  error: sandbox.stub(),
  info: sandbox.stub()
}

var lib, deploy

describe('commands/deploy', function() {
  before(function() {
    mockery.enable({ useCleanCache: true })
  })

  beforeEach(function() {
    mockery.registerMock('winston', log)
    mockery.registerMock('fs', fs)
    mockery.registerMock('request', request)
    mockery.registerMock('prompt', prompt)
    mockery.registerMock('../ml-deploy.js', mlDeploy)
    mockery.registerMock('../api.js', api)
    mockery.registerMock('../project.js', project)
    mockery.registerMock('../package.js', pkgLib)
    mockery.registerAllowables(['async', 'lodash', 'url', 'path'])

    mockery.registerAllowable('../../../lib/commands/deploy.js', true)

    lib = require('../../../lib/commands/deploy.js')
    deploy = lib.command
  })

  afterEach(function() {
    sandbox.reset()
    mockery.deregisterAll()
  })

  after(function() {
    mockery.disable()
  })

  it('should exist', function() {
    expect(deploy).to.not.be.undefined
    expect(deploy.usage).to.not.be.undefined
    expect(Object.keys(deploy).length).to.be.ok
  })

  it('should set connection defaults', function(done) {
    lib._getConnection({ username: 'u', password: 'p' }, function(err, connection) {
      expect(connection.username).to.equal('u')
      expect(connection.password).to.equal('p')
      expect(connection.host).to.equal('localhost')
      expect(connection.port).to.equal('8000')
      done()
    })
  })

  it('should handle error getting connection', function(done) {
    prompt.get.yieldsAsync(new Error('boom'))

    lib._getConnection({}, function(err) {
      sinon.assert.calledOnce(prompt.start)
      sinon.assert.calledOnce(prompt.get)
      expect(err).to.match(/boom/)
      done()
    })
  })

  it('should prompt to get username', function(done) {
    prompt.get.yieldsAsync(null, { username: 'z' })

    lib._getConnection({ password: 'p' }, function(err, connection) {
      sinon.assert.calledOnce(prompt.start)
      sinon.assert.calledOnce(prompt.get)
      expect(connection.username).to.equal('z')
      done()
    })
  })

  it('should prompt to get password', function(done) {
    prompt.get.yieldsAsync(null, { password: 'z' })

    lib._getConnection({ username: 'u' }, function(err, connection) {
      sinon.assert.calledOnce(prompt.start)
      sinon.assert.calledOnce(prompt.get)
      expect(connection.password).to.equal('z')
      done()
    })
  })

  it('should handle error getting packages in a dryrun', function(done) {
    project.getPackages.yieldsAsync(new Error('no way'))

    lib._dryRun(function(err) {
      sinon.assert.calledOnce(project.getPackages)
      expect(err).to.match(/no way/)
      done()
    })
  })

  it('should handle error parsing package contents in a dryrun', function(done) {
    project.getPackages.yieldsAsync(null, [{
      name: 'foo',
      version: '1.0.0'
    }])
    pkgLib.parseContents.yieldsAsync(new Error('bad package'))

    lib._dryRun(function(err) {
      sinon.assert.calledOnce(project.getPackages)
      sinon.assert.calledOnce(pkgLib.parseContents)
      expect(err).to.match(/bad package/)
      done()
    })
  })

  it('should do a dryrun deploy of a project-1', function(done) {
    project.getPackages.yieldsAsync(null, [{
      name: 'foo',
      version: '1.0.0'
    }])
    pkgLib.parseContents.yieldsAsync(null, {
      name: 'foo',
      version: '1.0.0',
      preparedDeploy: [{
        name: 'foo',
        format: 'sjs',
        type: 'asset',
        path: 'bar/foo.sjs',
        relativePath: 'bar/foo.sjs'
      },{
        name: 'bar',
        format: 'sjs',
        type: 'asset',
        path: 'bar/bar.sjs',
        relativePath: 'bar/bar.sjs'
      },{
        name: 'blah',
        format: 'sjs',
        type: 'resource',
        path: 'bar/blah.sjs',
        relativePath: 'bar/blah.sjs'
      }]
    })

    lib._dryRun(function(err) {
      sinon.assert.calledOnce(project.getPackages)
      sinon.assert.calledOnce(pkgLib.parseContents)
      sinon.assert.callCount(log.info, 5)
      // TODO: assert on log output (different prefixes, etc.)
      done()
    })
  })

  it('should do a dryrun deploy of a project-2', function(done) {
    project.getPackages.yieldsAsync(null, [{
      name: 'foo',
      version: '1.0.0'
    }])
    pkgLib.parseContents.yieldsAsync(null, {
      name: 'foo',
      version: '1.0.0',
      preparedDeploy: [{
        name: 'foo',
        format: 'sjs',
        type: 'asset',
        path: 'bar/foo.sjs',
        relativePath: 'bar/foo.sjs'
      },{
        name: 'bar',
        format: 'sjs',
        type: 'resource',
        path: 'bar/bar.sjs',
        relativePath: 'bar/bar.sjs'
      },{
        name: 'blah',
        format: 'sjs',
        type: 'resource',
        path: 'bar/blah.sjs',
        relativePath: 'bar/blah.sjs'
      }]
    })

    lib._dryRun(function(err) {
      sinon.assert.calledOnce(project.getPackages)
      sinon.assert.calledOnce(pkgLib.parseContents)
      sinon.assert.callCount(log.info, 5)
      // TODO: assert on log output (different prefixes, etc.)
      done()
    })
  })

  it('should handle error parsing packages', function(done) {
    pkgLib.parseContents.yieldsAsync(null, { preparedDeploy: [] })

    var packages = [{
      name: 'foo',
      version: '1.0.0'
    }]

    lib._deployPackages({}, packages, function(err) {
      sinon.assert.calledOnce(pkgLib.parseContents)
      expect(err).to.match(/must call pkgLib.parseContents/)
      sinon.assert.calledOnce(log.info)
      expect(log.info.args[0][0]).to.match(/deploying packages/)
      done()
    })
  })

  it('should handle error deploying package', function(done) {
    var pkg = {
      name: 'foo',
      version: '1.0.0',
      preparedDeploy: [{}]
    }

    mlDeploy.deployAsset.yieldsAsync(new Error('nope'))

    lib._deployPackage({}, pkg, function(err) {
      expect(err).to.match(/nope/)
      sinon.assert.calledOnce(mlDeploy.deployAsset)
      done()
    })
  })

  it('should handle deploy package', function(done) {
    var pkg = {
      name: 'foo',
      version: '1.0.0',
      preparedDeploy: [{
        name: 'foo',
        format: 'sjs',
        type: 'asset',
        path: 'bar/foo.sjs',
        relativePath: 'bar/foo.sjs'
      },{
        name: 'bar',
        format: 'xqy',
        type: 'module',
        path: 'bar/bar.sjs',
        relativePath: 'bar/bar.xqy',
        location: '/ext/mlpm_modules/bar/bar.xqy',
        ns: 'http://example.org/bar'
      },{
        name: 'blah',
        format: 'sjs',
        type: 'resource',
        path: 'bar/blah.sjs',
        relativePath: 'bar/blah.sjs'
      }]
    }

    mlDeploy.deployAsset.yieldsAsync(null)

    lib._deployPackage({}, pkg, function(err, moduleLocations) {
      expect(moduleLocations.length).to.equal(1)
      expect(moduleLocations[0].ns).to.equal('http://example.org/bar')
      expect(moduleLocations[0].location).to.equal('/ext/mlpm_modules/bar/bar.xqy')
      sinon.assert.calledOnce(log.info)
      expect(log.info.args[0][0]).to.match(/foo/)
      done()
    })
  })

  it('should handle error with --dryrun', function(done) {
    project.getPackages.yieldsAsync(new Error('no way'))

    deploy({ dryrun: true })

    setTimeout(function() {
      sinon.assert.calledOnce(project.getPackages)
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/no way/)
      done()
    }, 1)
  })

  it('should log error getting connection', function(done) {
    prompt.get.yieldsAsync(new Error('bad input'))

    deploy({})

    setTimeout(function() {
      sinon.assert.calledOnce(prompt.start)
      sinon.assert.calledOnce(prompt.get)
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/bad input/)
      done()
    }, 1)
  })

  it('should log error getting packages', function(done) {
    project.getPackages.yieldsAsync(new Error('broke'))

    deploy({ username: 'u', password: 'p' })

    setTimeout(function() {
      sinon.assert.calledOnce(project.getPackages)
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/broke/)
      done()
    }, 1)
  })

  it('should return error deploying packages', function(done) {
    project.getPackages.yieldsAsync(null, [{
      name: 'foo',
      version: '1.0.0'
    }])
    pkgLib.parseContents.yieldsAsync(null, {
      name: 'foo',
      version: '1.0.0',
      preparedDeploy: [{
        name: 'foo',
        type: 'sjs',
        path: 'bar/foo.sjs'
      }]
    })
    mlDeploy.deployAsset.yieldsAsync(new Error('no server'))

    deploy({ username: 'u', password: 'p' }, function(err) {
      sinon.assert.calledOnce(project.getPackages)
      sinon.assert.calledOnce(pkgLib.parseContents)
      // sinon.assert.calledOnce(log.error)
      expect(err).to.match(/no server/)
      done()
    })
  })

  it('should deploy project', function(done) {
    project.getPackages.yieldsAsync(null, [{
      name: 'foo',
      version: '1.0.0'
    }])
    pkgLib.parseContents.yieldsAsync(null, {
      name: 'foo',
      version: '1.0.0',
      preparedDeploy: [{
        name: 'foo',
        type: 'sjs',
        path: 'bar/foo.sjs'
      }]
    })
    mlDeploy.deployAsset.yields(null, {})

    deploy({ username: 'u', password: 'p' })

    setTimeout(function() {
      sinon.assert.calledOnce(project.getPackages)
      sinon.assert.calledOnce(pkgLib.parseContents)
      sinon.assert.calledOnce(mlDeploy.deployAsset)
      done()
    }, 1)
  })
})
