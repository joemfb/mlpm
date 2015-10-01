/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var sandbox = sinon.sandbox.create()
var util = { getConfig: sandbox.stub() }
var log = {
  error: sandbox.stub(),
  info: sandbox.stub()
}

var whoami

describe('commands/whoami', function() {
  before(function() {
    mockery.enable({ useCleanCache: true })
  })

  beforeEach(function() {
    mockery.registerMock('winston', log)
    mockery.registerMock('../util.js', util)

    mockery.registerAllowable('../../../lib/commands/whoami.js', true)
    whoami = require('../../../lib/commands/whoami.js').command
  })

  afterEach(function() {
    sandbox.reset()
    mockery.deregisterAll()
  })

  after(function() {
    mockery.disable()
  })

  it('should exist', function() {
    expect(whoami).to.not.be.undefined
    expect(whoami.usage).to.not.be.undefined
    expect(Object.keys(whoami).length).to.be.ok
  })

  it('should get user config', function(done) {
    util.getConfig.onCall(0).yields(null, { username: 'blah' })

    whoami({})

    process.nextTick(function() {
      expect(util.getConfig.calledOnce).to.be.true
      expect(log.info.calledOnce).to.be.true
      expect(log.info.args[0][0]).to.equal('blah')
      done()
    })
  })

  it('should handle error getting user config', function(done) {
    util.getConfig.onCall(0).yields(new Error('ugh'))

    whoami({})

    process.nextTick(function() {
      expect(util.getConfig.calledOnce).to.be.true
      expect(log.error.calledOnce).to.be.true
      expect(log.error.args[0][0]).to.match(/ugh/)
      done()
    })
  })
})
