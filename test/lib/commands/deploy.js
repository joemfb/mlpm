/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var sandbox = sinon.sandbox.create()
var fs = { readFileSync: sandbox.stub() }
var api = { responseStatus: sandbox.stub() }
var request = {
  // get: sandbox.stub(),
  put: sandbox.stub()
}
var prompt = {
  start: sandbox.stub(),
  get: sandbox.stub()
}
var pkgLib = { parseContents: sandbox.stub() }

var project = {
  getPackages: sandbox.stub(),
  symbols: {
    pkg: '|',
    last: '_'
  }
}

var deploy

describe('commands/deploy', function() {
  before(function() {
    mockery.enable({ useCleanCache: true })
  })

  beforeEach(function() {
    mockery.registerMock('fs', fs)
    mockery.registerMock('request', request)
    mockery.registerMock('prompt', prompt)
    mockery.registerMock('../api.js', api)
    mockery.registerMock('../project.js', project)
    mockery.registerMock('../package.js', pkgLib)
    mockery.registerAllowables(['async', 'lodash', 'url', 'path'])

    mockery.registerAllowable('../../../lib/commands/deploy.js', true)
    deploy = require('../../../lib/commands/deploy.js')
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
    request.put.yieldsAsync(null, { statusCode: 200 }, '{}')
    api.responseStatus.yields(null, {})

    deploy({ username: 'u', password: 'p' })

    // TODO: mock console.log, or use a logging framework
    setTimeout(function() {
      expect(project.getPackages.calledOnce).to.be.true
      expect(pkgLib.parseContents.calledOnce).to.be.true
      expect(request.put.calledOnce).to.be.true
      expect(api.responseStatus.calledOnce).to.be.true
      done()
    }, 1)
  })

  it('should do a dryrun deploy of a project', function(done) {
    deploy({ dryrun: true })

    // TODO: mock console.log, or use a logging framework
    process.nextTick(function() {
      expect(project.getPackages.calledOnce).to.be.true
      expect(pkgLib.parseContents.calledOnce).to.be.true
      done()
    })
  })
})
