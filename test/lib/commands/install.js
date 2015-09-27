/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var sandbox = sinon.sandbox.create()
var pkgLib = {
  isInstalled: sandbox.stub(),
  install: sandbox.stub()
}
var project = {
  getConfig: sandbox.stub().yieldsAsync(null, { name: 'foo' }),
  deleteDependency: sandbox.stub().yieldsAsync(null, [{ path: 'mlpm.json' }])
}
var api = {
  resolve: sandbox.stub(),
  get: sandbox.stub()
}

var install

describe('commands/install', function() {
  before(function() {
    mockery.enable({ useCleanCache: true })
  })

  beforeEach(function() {
    mockery.registerMock('../project.js', project)
    mockery.registerMock('../package.js', pkgLib)
    mockery.registerMock('../api.js', api)
    mockery.registerAllowables(['async', 'lodash'])

    mockery.registerAllowable('../../../lib/commands/install.js', true)
    install = require('../../../lib/commands/install.js')
  })

  afterEach(function() {
    sandbox.reset()
    mockery.deregisterAll()
  })

  after(function() {
    mockery.disable()
  })

  it('should exist', function() {
    expect(install).to.not.be.undefined
    expect(install.usage).to.not.be.undefined
    expect(Object.keys(install).length).to.be.ok
  })

  it('should install package', function(done) {
    api.resolve.yieldsAsync(null, {})
    pkgLib.isInstalled.yieldsAsync(null, true, { version: '1.0.0' })
    api.get.yieldsAsync(null, {})

    install({ package: 'bar' })

    // TODO: mock console.log, or use a logging framework
    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(pkgLib.install.calledOnce).to.be.true
      done()
    }, 1)
  })
})
