/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var sandbox = sinon.sandbox.create()
var api = { login: sandbox.stub() }
var prettyjson = { render: sandbox.stub() }
var prompt = {
  start: sandbox.stub(),
  get: sandbox.stub()
}
var project = {
  getConfig: sandbox.stub(),
  getDefaultConfig: sandbox.stub(),
  saveConfig: sandbox.stub()
}
var log = {
  error: sandbox.stub(),
  info: sandbox.stub()
}

var init

describe('commands/init', function() {
  before(function() {
    mockery.enable({ useCleanCache: true })
  })

  beforeEach(function() {
    mockery.registerMock('winston', log)
    mockery.registerMock('prompt', prompt)
    mockery.registerMock('prettyjson', prettyjson)
    mockery.registerMock('../project.js', project)
    mockery.registerAllowable('lodash')

    mockery.registerAllowable('../../../lib/commands/init.js', true)
    init = require('../../../lib/commands/init.js').command
  })

  afterEach(function() {
    sandbox.reset()
    mockery.deregisterAll()
  })

  after(function() {
    mockery.disable()
  })

  it('should exist', function() {
    expect(init).to.not.be.undefined
    expect(init.usage).to.not.be.undefined
    expect(Object.keys(init).length).to.be.ok
  })

  it('should handle getSchema error', function(done) {
    project.getConfig.yieldsAsync(new Error('no config'))
    project.getDefaultConfig.yieldsAsync(new Error('it broke'))

    init({})

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getDefaultConfig.calledOnce).to.be.true
      expect(prompt.start.called).to.be.false
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/it broke/)
      done()
    }, 1)
  })

  it('should handle config prompt error', function(done) {
    project.getConfig.yieldsAsync(null, {})
    project.getDefaultConfig.yieldsAsync(null, { repository: 'repo' })
    prompt.get.yieldsAsync(new Error('nope'))

    init({})

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getDefaultConfig.calledOnce).to.be.true
      expect(prompt.start.calledOnce).to.be.true
      expect(prompt.get.calledOnce).to.be.true
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/nope/)
      done()
    }, 1)
  })

  it('should handle save prompt error', function(done) {
    project.getConfig.yieldsAsync(null, {})
    project.getDefaultConfig.yieldsAsync(null, { repository: 'repo' })
    prompt.get.onCall(0).yieldsAsync(null, {})
    prompt.get.onCall(1).yieldsAsync(new Error('?'))

    init({})

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getDefaultConfig.calledOnce).to.be.true
      expect(prompt.start.calledTwice).to.be.true
      expect(prompt.get.calledTwice).to.be.true
      sinon.assert.calledOnce(log.info)
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/\?/)
      done()
    }, 1)
  })

  it('should handle saveConfig error', function(done) {
    project.getConfig.yieldsAsync(null, {})
    project.getDefaultConfig.yieldsAsync(null, { repository: 'repo' })
    prompt.get.resetBehavior()
    prompt.get.yieldsAsync(null, { save: 'y' })
    project.saveConfig.yieldsAsync(new Error('no save'))

    init({})

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getDefaultConfig.calledOnce).to.be.true
      expect(prompt.start.calledTwice).to.be.true
      expect(prompt.get.calledTwice).to.be.true
      sinon.assert.calledOnce(project.saveConfig)
      sinon.assert.calledOnce(log.info)
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/no save/)
      done()
    }, 1)
  })

  it('should init', function(done) {
    project.getConfig.yieldsAsync(new Error('blah'))
    project.getDefaultConfig.yieldsAsync(null, { repository: 'repo' })
    prompt.get.yieldsAsync(null, { save: 'n' })
    project.saveConfig.yieldsAsync(null)

    init({})

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getDefaultConfig.calledOnce).to.be.true
      expect(prompt.start.calledTwice).to.be.true
      expect(prompt.get.calledTwice).to.be.true
      sinon.assert.callCount(project.saveConfig, 0)
      sinon.assert.calledOnce(log.info)
      done()
    }, 1)
  })

  it('should init and save', function(done) {
    project.getConfig.yieldsAsync(null, {})
    project.getDefaultConfig.yieldsAsync(null, { repository: 'repo' })
    prompt.get.yieldsAsync(null, { save: 'yes' })
    project.saveConfig.yieldsAsync(null)

    init({})

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getDefaultConfig.calledOnce).to.be.true
      expect(prompt.start.calledTwice).to.be.true
      expect(prompt.get.calledTwice).to.be.true
      sinon.assert.calledOnce(project.saveConfig)
      sinon.assert.calledOnce(log.info)
      done()
    }, 1)
  })
})
