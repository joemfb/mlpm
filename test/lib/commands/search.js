/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var sandbox = sinon.sandbox.create()
var columnify = sandbox.stub()
var api = { search: sandbox.stub() }
var log = {
  error: sandbox.stub(),
  info: sandbox.stub()
}

var search

describe('commands/search', function() {
  before(function() {
    mockery.enable({ useCleanCache: true })
  })

  beforeEach(function() {
    mockery.registerMock('winston', log)
    mockery.registerMock('columnify', columnify)
    mockery.registerMock('../api.js', api)
    mockery.registerAllowable('lodash')

    mockery.registerAllowable('../../../lib/commands/search.js', true)
    search = require('../../../lib/commands/search.js').command
  })

  afterEach(function() {
    sandbox.reset()
    mockery.deregisterAll()
  })

  after(function() {
    mockery.disable()
  })

  it('should exist', function() {
    expect(search).to.not.be.undefined
    expect(search.usage).to.not.be.undefined
    expect(Object.keys(search).length).to.be.ok
  })

  it('should search', function(done) {
    api.search.yieldsAsync(null, {
      results: [{
        metadata: [
          { name: 'Semantic News Search', 'metadata-type': 'element'},
          { description: 'value1', 'metadata-type' :'element'},
          { version: 'value2', 'metadata-type': 'element'},
          { version: 'other', 'metadata-type': 'element'},
          { modified: 'value3', 'metadata-type': 'element'}
        ]
      }]
    })

    search({})

    process.nextTick(function() {
      expect(api.search.calledOnce).to.be.true
      expect(columnify.calledOnce).to.be.true
      sinon.assert.callCount(log.info, 1)
      done()
    })
  })

  it('should search', function(done) {
    api.search.yieldsAsync(null, {
      total: 2,
      'page-length': 1,
      results: [{
        metadata: [
          { name: 'Semantic News Search', 'metadata-type': 'element'},
          { description: 'value1', 'metadata-type' :'element'},
          { version: 'value2', 'metadata-type': 'element'},
          { modified: 'value3', 'metadata-type': 'element'}
        ]
      }]
    })

    search({})

    process.nextTick(function() {
      expect(api.search.calledOnce).to.be.true
      expect(columnify.calledOnce).to.be.true
      sinon.assert.callCount(log.info, 2)
      done()
    })
  })

  it('should handle search error', function(done) {
    api.search.yieldsAsync(new Error('search'))

    search({})

    // TODO: mock console.log, or use a logging framework
    process.nextTick(function() {
      expect(api.search.calledOnce).to.be.true
      expect(columnify.calledOnce).to.be.false
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/search/)
      done()
    })
  })
})
