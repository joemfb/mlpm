/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var sandbox = sinon.sandbox.create()
var api = { info: sandbox.stub() }
var project = { getConfig: sandbox.stub() }
var prettyjson = { render: sandbox.stub() }

var info

describe('commands/info', function() {
  before(function() {
    mockery.enable({ useCleanCache: true })
  })

  beforeEach(function() {
    mockery.registerMock('prettyjson', prettyjson)
    mockery.registerMock('../project.js', project)
    mockery.registerMock('../api.js', api)

    mockery.registerAllowable('../../../lib/commands/info.js', true)
    info = require('../../../lib/commands/info.js').command
  })

  afterEach(function() {
    sandbox.reset()
    mockery.deregisterAll()
  })

  after(function() {
    mockery.disable()
  })

  it('should exist', function() {
    expect(info).to.not.be.undefined
    expect(info.usage).to.not.be.undefined
    expect(Object.keys(info).length).to.be.ok
  })

  it('should get project info', function(done) {
    project.getConfig.onCall(0).yields(null, {})

    info({})

    // TODO: mock console.log, or use a logging framework
    process.nextTick(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(prettyjson.render.calledOnce).to.be.true
      done()
    })
  })

  it('should get package info', function(done) {
    api.info.onCall(0).yields(new Error('blah'))

    info({ package: 'blah' })

    // TODO: mock console.log, or use a logging framework
    process.nextTick(function() {
      expect(api.info.calledOnce).to.be.true
      expect(prettyjson.render.calledOnce).to.be.false
      done()
    })
  })
})
