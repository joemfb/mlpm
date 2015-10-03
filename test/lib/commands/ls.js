/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var sandbox = sinon.sandbox.create()
var project = {
  getPackages: sandbox.stub(),
  symbols: {
    pkg: '|',
    last: '_'
  }
}

var ls

describe('commands/ls', function() {
  before(function() {
    mockery.enable({ useCleanCache: true })
  })

  beforeEach(function() {
    mockery.registerMock('../project.js', project)
    mockery.registerAllowable('lodash')

    mockery.registerAllowable('../../../lib/commands/ls.js', true)
    ls = require('../../../lib/commands/ls.js').command
  })

  afterEach(function() {
    sandbox.reset()
    mockery.deregisterAll()
  })

  after(function() {
    mockery.disable()
  })

  it('should exist', function() {
    expect(ls).to.not.be.undefined
    expect(ls.usage).to.not.be.undefined
    expect(Object.keys(ls).length).to.be.ok
  })

  it('should get user config', function(done) {
    project.getPackages.onCall(0).yields(null, [
      { name: 'foo', version: '1.2.3' },
      { name: 'bar', version: '3.2.1' }
    ])

    ls({})

    // TODO: mock console.log, or use a logging framework
    process.nextTick(function() {
      expect(project.getPackages.calledOnce).to.be.true
      done()
    })
  })
})
