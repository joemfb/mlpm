/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var sandbox = sinon.sandbox.create()
var semver = {
  valid: sandbox.stub(),
  inc: sandbox.stub()
}
var project = {
  getConfig: sandbox.stub(),
  getRepoStatus: sandbox.stub(),
  saveConfig: sandbox.stub(),
  commitConfig: sandbox.stub(),
  tagRepo: sandbox.stub()
}

var version

describe('commands/version', function() {
  before(function() {
    mockery.enable({ useCleanCache: true })
  })

  beforeEach(function() {
    mockery.registerMock('semver', semver)
    mockery.registerMock('../project.js', project)

    mockery.registerAllowable('../../../lib/commands/version.js', true)
    version = require('../../../lib/commands/version.js')
  })

  afterEach(function() {
    sandbox.reset()
    mockery.deregisterAll()
  })

  after(function() {
    mockery.disable()
  })

  it('should exist', function() {
    expect(version).to.not.be.undefined
    expect(version.usage).to.not.be.undefined
    expect(Object.keys(version).length).to.be.ok
  })


  // it('should handle getConfig error', function(done) {
  //   project.getConfig.yieldsAsync(null, new Error('blah'))

  //   version({})

  //   // TODO: mock console.log, or use a logging framework
  //   setTimeout(function() {
  //     expect(project.getConfig.calledOnce).to.be.true
  //     expect(project.getRepoStatus.calledOnce).to.be.false
  //     done()
  //   }, 10)
  // })

  it('should handle semver errors', function(done) {
    project.getConfig.yields(null, { name: 'foo' })
    project.getRepoStatus.yields(null, [])

    version({})

    // TODO: mock console.log, or use a logging framework
    process.nextTick(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getRepoStatus.calledOnce).to.be.true
      expect(semver.inc.calledOnce).to.be.true
      expect(semver.valid.calledOnce).to.be.true
      expect(project.saveConfig.calledOnce).to.be.false
      done()
    })
  })

  it('should handle semver errors', function(done) {
    semver.valid.returns(true)

    version({ version: '1.0.0' })

    // TODO: mock console.log, or use a logging framework
    process.nextTick(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getRepoStatus.calledOnce).to.be.true
      expect(semver.inc.calledOnce).to.be.false
      expect(semver.valid.calledOnce).to.be.true
      expect(project.saveConfig.calledOnce).to.be.true
      done()
    })
  })
})
