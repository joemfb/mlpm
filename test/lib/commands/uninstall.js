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
var log = {
  error: sandbox.stub(),
  info: sandbox.stub()
}

var uninstall

describe('commands/uninstall', function() {
  before(function() {
    mockery.enable({ useCleanCache: true })
  })

  beforeEach(function() {
    mockery.registerMock('winston', log)
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

    process.nextTick(function() {
      expect(pkgLib.uninstall.calledOnce).to.be.false
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/missing required parameter/)
      done()
    })
  })

  it('should handle error uninstalling package', function(done) {
    pkgLib.uninstall.yieldsAsync(new Error('no way, jose'))

    uninstall({ package: 'foo' })

    process.nextTick(function() {
      expect(pkgLib.uninstall.calledOnce).to.be.true
      expect(project.getConfig.calledOnce).to.be.false
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/no way, jose/)
      done()
    })
  })

  it('should uninstall package', function(done) {
    pkgLib.uninstall.yieldsAsync(null)

    uninstall({ package: 'foo' })

    process.nextTick(function() {
      expect(pkgLib.uninstall.calledOnce).to.be.true
      expect(project.getConfig.calledOnce).to.be.false
      sinon.assert.calledOnce(log.info)
      expect(log.info.args[0][0]).to.match(/uninstalled foo/)
      done()
    })
  })

  it('should handler error getting config', function(done) {
    project.getConfig.yieldsAsync(new Error('where is it?'))

    uninstall({ package: 'foo', save: true })

    setTimeout(function() {
      expect(pkgLib.uninstall.calledOnce).to.be.true
      expect(project.getConfig.calledOnce).to.be.true
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/where is it/)
      done()
    }, 1)
  })

  it('should handler error removing dependency from mlpm.json', function(done) {
    project.getConfig.yieldsAsync(null, { name: 'foo' })
    project.deleteDependency.yieldsAsync(new Error('it\'s not working'))

    uninstall({ package: 'foo', save: true })

    setTimeout(function() {
      expect(pkgLib.uninstall.calledOnce).to.be.true
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.deleteDependency.calledOnce).to.be.true
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/it's not working/)
      done()
    }, 1)
  })

  it('should uninstall package, and remove from mlpm.json', function(done) {
    project.deleteDependency.yieldsAsync(null)

    uninstall({ package: 'foo', save: true })

    setTimeout(function() {
      expect(pkgLib.uninstall.calledOnce).to.be.true
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.deleteDependency.calledOnce).to.be.true
      sinon.assert.calledTwice(log.info)
      expect(log.info.args[0][0]).to.match(/uninstalled foo/)
      expect(log.info.args[1][0]).to.match(/removed foo/)
      done()
    }, 1)
  })
})
