/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var sandbox = sinon.sandbox.create()
var api = { login: sandbox.stub() }
var util = {
  getConfig: sandbox.stub(),
  saveConfig: sandbox.stub()
}
var prompt = {
  start: sandbox.stub(),
  get: sandbox.stub()
}
var log = {
  error: sandbox.stub(),
  info: sandbox.stub()
}

var login

describe('commands/login', function() {
  before(function() {
    mockery.enable({ useCleanCache: true })
  })

  beforeEach(function() {
    mockery.registerMock('winston', log)
    mockery.registerMock('prompt', prompt)
    mockery.registerMock('../api.js', api)
    mockery.registerMock('../util.js', util)

    mockery.registerAllowable('../../../lib/commands/login.js', true)
    login = require('../../../lib/commands/login.js').command
  })

  afterEach(function() {
    sandbox.reset()
    mockery.deregisterAll()
  })

  after(function() {
    mockery.disable()
  })

  it('should exist', function() {
    expect(login).to.not.be.undefined
    expect(login.usage).to.not.be.undefined
    expect(Object.keys(login).length).to.be.ok
  })

  it('should handle error when prompting for login', function(done) {
    util.getConfig.yieldsAsync(null, { token: 'token'})
    prompt.get.yieldsAsync(new Error('bad prompt'))

    login({})

    setTimeout(function() {
      expect(util.getConfig.calledOnce).to.be.true
      expect(prompt.start.calledOnce).to.be.true
      expect(prompt.get.calledOnce).to.be.true
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/bad prompt/)
      done()
    }, 1)
  })

  it('should prompt for login', function(done) {
    util.getConfig.yieldsAsync(null, {})
    prompt.get.yieldsAsync(null, { token: 'token' })
    api.login.yieldsAsync(null, {
      username: 'u',
      name: 'U',
      email: 'u@z.com',
      token: 'token'
    })
    util.saveConfig.yieldsAsync(null)

    login({})

    setTimeout(function() {
      expect(util.getConfig.calledOnce).to.be.true
      expect(prompt.start.calledOnce).to.be.true
      expect(prompt.get.calledOnce).to.be.true
      sinon.assert.calledTwice(log.info)
      expect(log.info.args[0][0]).to.equal('enter mlpm registry token')
      expect(log.info.args[1][0]).to.equal('authenticated u')
      expect(api.login.calledOnce).to.be.true
      expect(util.saveConfig.calledOnce).to.be.true
      done()
    }, 1)
  })

  it('should prompt for login with default token', function(done) {
    util.getConfig.yieldsAsync(null, { token: 'token' })

    login({})

    setTimeout(function() {
      expect(util.getConfig.calledOnce).to.be.true
      expect(prompt.start.calledOnce).to.be.true
      expect(prompt.get.calledOnce).to.be.true
      expect(prompt.get.args[0][0].properties.token.default).to.equal('token')
      sinon.assert.calledTwice(log.info)
      expect(log.info.args[0][0]).to.equal('enter mlpm registry token')
      expect(log.info.args[1][0]).to.equal('authenticated u')
      done()
    }, 1)
  })

  it('should login with token', function(done) {
    util.getConfig.yieldsAsync(null, { token: 'token' })
    login({ token: 'other-token' })

    setTimeout(function() {
      expect(api.login.calledOnce).to.be.true
      expect(util.saveConfig.calledOnce).to.be.true
      sinon.assert.calledTwice(log.info)
      expect(log.info.args[0][0]).to.equal('updating credentials')
      expect(log.info.args[1][0]).to.equal('authenticated u')
      done()
    }, 1)
  })

  it('should identify update with same token and return', function(done) {
    util.getConfig.yieldsAsync(null, { token: 'token' })

    login({ token: 'token' })

    setTimeout(function() {
      expect(api.login.calledOnce).to.be.false
      sinon.assert.callCount(log.info, 0)
      done()
    }, 1)
  })

  it('should handle login error', function(done) {
    util.getConfig.yieldsAsync(null, { token: 'other-token' })
    api.login.yieldsAsync(new Error('login error'))

    login({ token: 'token' })

    setTimeout(function() {
      expect(api.login.calledOnce).to.be.true
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/login error/)
      done()
    }, 1)
  })

  it('should handle saveConfig error', function(done) {
    util.getConfig.yieldsAsync(null, {})
    api.login.yieldsAsync(null, {
      username: 'u',
      name: 'U',
      email: 'u@z.com',
      token: 'token'
    })
    util.saveConfig.yieldsAsync(new Error('no save'))

    login({ token: 'token' })

    setTimeout(function() {
      expect(api.login.calledOnce).to.be.true
      expect(util.saveConfig.calledOnce).to.be.true
      sinon.assert.calledOnce(log.info)
      expect(log.info.args[0][0]).to.equal('couldn\'t save credentials')
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/no save/)
      done()
    }, 1)
  })

  it('should identify update with different token and continue', function(done) {
    util.getConfig.yieldsAsync(null, { token: 'other-token' })
    api.login.yieldsAsync(null, {
      username: 'u',
      name: 'U',
      email: 'u@z.com',
      token: 'token'
    })
    util.saveConfig.yieldsAsync(null)

    login({ token: 'token' })

    // TODO: mock console.log, or use a logging framework
    setTimeout(function() {
      expect(api.login.calledOnce).to.be.true
      expect(util.saveConfig.calledOnce).to.be.true
      sinon.assert.calledTwice(log.info)
      expect(log.info.args[0][0]).to.equal('updating credentials')
      expect(log.info.args[1][0]).to.equal('authenticated u')
      done()
    }, 1)
  })
})
