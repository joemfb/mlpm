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

var unpublish

describe('commands/unpublish', function() {
  before(function() {
    mockery.enable({ useCleanCache: true })
  })

  beforeEach(function() {
    mockery.registerMock('../util.js', util)
    mockery.registerMock('../api.js', api)

    mockery.registerAllowable('../../../lib/commands/unpublish.js', true)
    unpublish = require('../../../lib/commands/unpublish.js')
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

    // TODO: mock console.log, or use a logging framework
    process.nextTick(function() {
      expect(api.info.calledOnce).to.be.false
      done()
    })
  })

  it('should not unpublish without package version', function(done) {
    api.info.yieldsAsync(null, { versions: ['1', '2'] })
    unpublish({ package: 'foo' })

    // TODO: mock console.log, or use a logging framework
    process.nextTick(function() {
      expect(api.info.calledOnce).to.be.true
      done()
    })
  })

  it('should not unpublish without package version', function(done) {
    api.info.yieldsAsync(null, { versions: ['1', '2'] })
    unpublish({ package: 'foo', version: '1' })

    // TODO: mock console.log, or use a logging framework
    process.nextTick(function() {
      expect(api.info.calledOnce).to.be.true
      expect(util.getAuth.calledOnce).to.be.true
      done()
    })
  })

  it('should not unpublish all without --force arg', function(done) {
    api.info.yieldsAsync(null, { versions: ['1', '2'] })
    api.unpublish.yieldsAsync(null)
    util.getAuth.yieldsAsync(null, { token: 'token' })

    unpublish({ package: 'foo', force: true })

    // TODO: mock console.log, or use a logging framework
    setTimeout(function() {
      expect(api.info.calledOnce).to.be.true
      expect(util.getAuth.calledOnce).to.be.true
      expect(api.unpublish.calledOnce).to.be.true
      done()
    }, 0)
  })

  it('should get info for package to be unpublished', function(done) {
    api.info.yieldsAsync(new Error('nope'))
    unpublish({ package: 'foo' })

    // TODO: mock console.log, or use a logging framework
    process.nextTick(function() {
      expect(api.info.calledOnce).to.be.true
      expect(util.getAuth.calledOnce).to.be.false
      done()
    })
  })
})
