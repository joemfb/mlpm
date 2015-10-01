/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var sandbox = sinon.sandbox.create()
var api = {
  info: sandbox.stub(),
  unpublish: sandbox.stub()
}
var util = { getAuth: sandbox.stub() }
var log = {
  error: sandbox.stub(),
  info: sandbox.stub()
}

var unpublish

describe('commands/unpublish', function() {
  before(function() {
    mockery.enable({ useCleanCache: true })
  })

  beforeEach(function() {
    mockery.registerMock('winston', log)
    mockery.registerMock('../util.js', util)
    mockery.registerMock('../api.js', api)

    mockery.registerAllowable('../../../lib/commands/unpublish.js', true)
    unpublish = require('../../../lib/commands/unpublish.js').command
  })

  afterEach(function() {
    sandbox.reset()
    mockery.deregisterAll()
  })

  after(function() {
    mockery.disable()
  })

  it('should exist', function() {
    expect(unpublish).to.not.be.undefined
    expect(unpublish.usage).to.not.be.undefined
    expect(Object.keys(unpublish).length).to.be.ok
  })

  it('should not unpublish without package name', function(done) {
    unpublish({})

    process.nextTick(function() {
      expect(api.info.calledOnce).to.be.false
      expect(log.error.calledOnce).to.be.true
      expect(log.error.args[0][0]).to.equal('missing required parameter: package name')
      done()
    })
  })

  it('should not unpublish without package version', function(done) {
    api.info.yieldsAsync(null, { versions: ['1', '2'] })
    unpublish({ package: 'foo' })

    process.nextTick(function() {
      expect(api.info.calledOnce).to.be.true
      expect(log.error.calledOnce).to.be.true
      expect(log.error.args[0][0]).to.match(/refusing to unpublish/)
      done()
    })
  })

  it('should handle error when gettting package info', function(done) {
    api.info.yieldsAsync(new Error('nope'))
    unpublish({ package: 'foo' })

    process.nextTick(function() {
      expect(api.info.calledOnce).to.be.true
      expect(util.getAuth.calledOnce).to.be.false
      expect(log.error.calledOnce).to.be.true
      expect(log.error.args[0][0]).to.match(/nope/)
      done()
    })
  })

  it('should handle error when getting auth', function(done) {
    api.info.yieldsAsync(null, { versions: ['1', '2'] })
    util.getAuth.yieldsAsync(new Error('no can do'))

    unpublish({ package: 'foo', version: '1' })

    setTimeout(function() {
      expect(api.info.calledOnce).to.be.true
      expect(util.getAuth.calledOnce).to.be.true
      expect(api.unpublish.calledOnce).to.be.false
      expect(log.error.calledOnce).to.be.true
      expect(log.error.args[0][0]).to.match(/no can do/)
      done()
    }, 1)
  })

  it('should handle error on unpublish', function(done) {
    api.info.yieldsAsync(null, { versions: ['1', '2'] })
    util.getAuth.yieldsAsync(null, { token: 'token' })
    api.unpublish.yieldsAsync(new Error('I can\'t let you do that Dave'))

    unpublish({ package: 'foo', version: '1' })

    setTimeout(function() {
      expect(api.info.calledOnce).to.be.true
      expect(util.getAuth.calledOnce).to.be.true
      expect(api.unpublish.calledOnce).to.be.true
      expect(log.error.calledOnce).to.be.true
      expect(log.error.args[0][0]).to.match(/I can't let you do that Dave/)
      done()
    }, 1)
  })

  it('should unpublish', function(done) {
    api.info.yieldsAsync(null, { versions: ['1', '2'] })
    util.getAuth.yieldsAsync(null, { token: 'token' })
    api.unpublish.yieldsAsync(null)

    unpublish({ package: 'foo', version: '1' })

    setTimeout(function() {
      expect(api.info.calledOnce).to.be.true
      expect(util.getAuth.calledOnce).to.be.true
      expect(api.unpublish.calledOnce).to.be.true
      expect(log.info.calledOnce).to.be.true
      expect(log.info.args[0][0]).to.equal('unpublished foo@1')
      done()
    }, 1)
  })

  it('should unpublish all with --force', function(done) {
    api.info.yieldsAsync(null, { versions: ['1', '2'] })
    util.getAuth.yieldsAsync(null, { token: 'token' })
    api.unpublish.yieldsAsync(null)

    unpublish({ package: 'foo', force: true })

    setTimeout(function() {
      expect(api.info.calledOnce).to.be.true
      expect(util.getAuth.calledOnce).to.be.true
      expect(api.unpublish.calledOnce).to.be.true
      expect(log.info.calledTwice).to.be.true
      expect(log.info.args[0][0]).to.match(/Warning, unpublishing entire project/)
      expect(log.info.args[1][0]).to.equal('unpublished foo')
      done()
    }, 0)
  })
})
