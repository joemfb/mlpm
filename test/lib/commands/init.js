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
  getDefaultConfig: sandbox.stub()
}

var init

describe('commands/init', function() {
  before(function() {
    mockery.enable({ useCleanCache: true })
  })

  beforeEach(function() {
    mockery.registerMock('prompt', prompt)
    mockery.registerMock('prettyjson', prettyjson)
    mockery.registerMock('../project.js', project)
    mockery.registerAllowable('lodash')

    mockery.registerAllowable('../../../lib/commands/init.js', true)
    init = require('../../../lib/commands/init.js')
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

  it('should init', function(done) {
    project.getConfig.yieldsAsync(null, {})
    project.getDefaultConfig.yieldsAsync(null, { repository: 'repo' })
    prompt.get.yieldsAsync(null, {})

    init({})

    // TODO: mock console.log, or use a logging framework
    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getDefaultConfig.calledOnce).to.be.true
      expect(prompt.start.calledTwice).to.be.true
      expect(prompt.get.calledTwice).to.be.true
      done()
    }, 1)
  })
})
