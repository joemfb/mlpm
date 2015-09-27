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

var login

describe('commands/login', function() {
  before(function() {
    mockery.enable({ useCleanCache: true })
  })

  beforeEach(function() {
    mockery.registerMock('prompt', prompt)
    mockery.registerMock('../api.js', api)
    mockery.registerMock('../util.js', util)

    mockery.registerAllowable('../../../lib/commands/login.js', true)
    login = require('../../../lib/commands/login.js')
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

    // TODO: mock console.log, or use a logging framework
    setTimeout(function() {
      expect(util.getConfig.calledOnce).to.be.true
      expect(prompt.start.calledOnce).to.be.true
      expect(prompt.get.calledOnce).to.be.true
      expect(api.login.calledOnce).to.be.true
      expect(util.saveConfig.calledOnce).to.be.true
      done()
    }, 1)
  })

  it('should prompt for login with default token', function(done) {
    util.getConfig.yieldsAsync(null, { token: 'token'})

    login({})

    // TODO: mock console.log, or use a logging framework
    setTimeout(function() {
      expect(util.getConfig.calledOnce).to.be.true
      expect(prompt.start.calledOnce).to.be.true
      expect(prompt.get.calledOnce).to.be.true
      expect(prompt.get.args[0][0].properties.token.default).to.equal('token')
      done()
    }, 1)
  })

  it('should login with token', function(done) {
    login({ token: 'other-token' })

    // TODO: mock console.log, or use a logging framework
    setTimeout(function() {
      expect(api.login.calledOnce).to.be.true
      expect(util.saveConfig.calledOnce).to.be.true
      done()
    }, 1)
  })

  it('should identify update with same token and return', function(done) {
    util.getConfig.yieldsAsync(null, { token: 'token' })

    login({ token: 'token' })

    // TODO: mock console.log, or use a logging framework
    setTimeout(function() {
      expect(api.login.calledOnce).to.be.false
      done()
    }, 1)
  })

  it('should identify update with different token and continue', function(done) {
    util.getConfig.yieldsAsync(null, { token: 'other-token' })

    login({ token: 'token' })

    // TODO: mock console.log, or use a logging framework
    setTimeout(function() {
      expect(api.login.calledOnce).to.be.true
      expect(util.saveConfig.calledOnce).to.be.true
      done()
    }, 1)
  })
})
