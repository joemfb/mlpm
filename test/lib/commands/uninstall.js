/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var sandbox = sinon.sandbox.create()
var pkgLib = { uninstall: sandbox.stub().yields(null) }
var project = {
  getConfig: sandbox.stub().yields(null, { name: 'foo' }),
  deleteDependency: sandbox.stub().yields(null, [{ path: 'mlpm.json' }])
}

var uninstall

describe('commands/uninstall', function() {
  before(function() {
    mockery.enable({ useCleanCache: true })
  })

  beforeEach(function() {
    mockery.registerMock('../project.js', project)
    mockery.registerMock('../package.js', pkgLib)

    mockery.registerAllowable('../../../lib/commands/uninstall.js', true)
    uninstall = require('../../../lib/commands/uninstall.js').command
  })

  afterEach(function() {
    sandbox.reset()
    mockery.deregisterAll()
  })

  after(function() {
    mockery.disable()
  })

  it('should exist', function() {
    expect(uninstall).to.not.be.undefined
    expect(uninstall.usage).to.not.be.undefined
    expect(Object.keys(uninstall).length).to.be.ok
  })

  it('should not uninstall without package name', function(done) {
    uninstall({})

    // TODO: mock console.log, or use a logging framework
    process.nextTick(function() {
      expect(pkgLib.uninstall.calledOnce).to.be.false
      done()
    })
  })

  it('should uninstall package', function(done) {
    uninstall({ package: 'foo' })

    // TODO: mock console.log, or use a logging framework
    process.nextTick(function() {
      expect(pkgLib.uninstall.calledOnce).to.be.true
      expect(project.getConfig.calledOnce).to.be.false
      done()
    })
  })

  it('should uninstall package', function(done) {
    uninstall({ package: 'foo', save: true })

    // TODO: mock console.log, or use a logging framework
    process.nextTick(function() {
      expect(pkgLib.uninstall.calledOnce).to.be.true
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.deleteDependency.calledOnce).to.be.true
      done()
    })
  })
})
