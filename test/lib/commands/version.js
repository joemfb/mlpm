/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var sandbox = sinon.sandbox.create()
var semver = {
  valid: sandbox.stub().returnsArg(0),
  inc: sandbox.stub()
}
var project = {
  getConfig: sandbox.stub(),
  getRepoStatus: sandbox.stub(),
  saveConfig: sandbox.stub(),
  commitConfig: sandbox.stub(),
  tagRepo: sandbox.stub()
}
var log = {
  error: sandbox.stub(),
  info: sandbox.stub()
}

var version

describe('commands/version', function() {
  before(function() {
    mockery.enable({ useCleanCache: true })
  })

  beforeEach(function() {
    mockery.registerMock('winston', log)
    mockery.registerMock('semver', semver)
    mockery.registerMock('../project.js', project)

    mockery.registerAllowable('../../../lib/commands/version.js', true)
    version = require('../../../lib/commands/version.js').command
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

  it('should handle getConfig error', function(done) {
    project.getConfig.yieldsAsync(new Error('blah'))

    version({})

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getRepoStatus.calledOnce).to.be.false
      expect(log.error.calledOnce).to.be.true
      expect(log.error.args[0][0]).to.match(/blah/)
      done()
    }, 10)
  })

  it('should handle non-empty git repository', function(done) {
    project.getConfig.yieldsAsync(null, { name: 'foo', version: '1.0.0' })
    project.getRepoStatus.yieldsAsync(null, ['foo.xqy'])

    version({})

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getRepoStatus.calledOnce).to.be.true
      expect(log.error.calledOnce).to.be.true
      expect(log.error.args[0][0]).to.match(/git repository not clean/)
      expect(project.saveConfig.calledOnce).to.be.false
      done()
    }, 1)
  })

  it('should handle semver errors - 1', function(done) {
    project.getRepoStatus.yieldsAsync(null, [])

    version({})

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getRepoStatus.calledOnce).to.be.true
      expect(semver.valid.calledOnce).to.be.true
      expect(semver.inc.calledOnce).to.be.true
      expect(log.error.calledOnce).to.be.true
      expect(log.error.args[0][0]).to.match(/invalid input/)
      expect(project.saveConfig.calledOnce).to.be.false
      done()
    }, 1)
  })

  it('should handle semver errors - 2', function(done) {
    project.saveConfig.yieldsAsync(null)
    project.commitConfig.yieldsAsync(null)
    project.tagRepo.yieldsAsync(null)

    version({ version: '1.0.0' })

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getRepoStatus.calledOnce).to.be.true
      expect(semver.valid.calledOnce).to.be.true
      expect(project.saveConfig.called).to.be.false
      expect(log.error.calledOnce).to.be.true
      expect(log.error.args[0][0]).to.match(/Version not changed/)
      done()
    }, 1)
  })

  it('should handle error on saveConfig', function(done) {
    project.saveConfig.yieldsAsync(new Error('can\'t'))

    version({ version: '2.0.0' })

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getRepoStatus.calledOnce).to.be.true
      expect(semver.valid.calledOnce).to.be.true
      expect(project.saveConfig.calledOnce).to.be.true
      expect(log.error.called).to.be.true
      expect(log.error.args[0][0]).to.match(/can't/)
      done()
    }, 1)
  })

  it('should skip git operations for non-git projects', function(done) {
    project.getConfig.yieldsAsync(null, { name: 'foo', version: '1.0.0' })
    project.getRepoStatus.yieldsAsync(null, [])
    project.saveConfig.yieldsAsync(null)
    project.getRepoStatus.yieldsAsync(new Error('blah'))

    version({ version: '2.0.0' })

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getRepoStatus.calledOnce).to.be.true
      expect(semver.valid.calledOnce).to.be.true
      expect(project.saveConfig.calledOnce).to.be.true
      expect(log.info.calledOnce).to.be.true
      expect(log.info.args[0][0]).to.match(/updated project version/)
      done()
    }, 1)
  })

  it('should update version and handle error on commit', function(done) {
    project.getConfig.yieldsAsync(null, { name: 'foo', version: '1.0.0' })
    project.saveConfig.yieldsAsync(null)
    project.getRepoStatus.yieldsAsync(null, [])
    project.commitConfig.yieldsAsync(new Error('nope'))

    version({ version: '2.0.0' })

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getRepoStatus.calledOnce).to.be.true
      expect(semver.valid.calledOnce).to.be.true
      expect(project.saveConfig.calledOnce).to.be.true
      expect(log.info.calledOnce).to.be.true
      expect(log.info.args[0][0]).to.match(/updated project version/)
      expect(project.commitConfig.calledOnce).to.be.true
      expect(log.error.calledOnce).to.be.true
      expect(log.error.args[0][0]).to.match(/nope/)
      done()
    }, 1)
  })

  it('should update version, commit, and handle error on tag', function(done) {
    project.getConfig.yieldsAsync(null, { name: 'foo', version: '1.0.0' })
    project.saveConfig.yieldsAsync(null)
    project.getRepoStatus.yieldsAsync(null, [])
    project.commitConfig.yieldsAsync(null)
    project.tagRepo.yieldsAsync(new Error('not today'))

    version({ version: '2.0.0' })

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getRepoStatus.calledOnce).to.be.true
      expect(semver.valid.calledOnce).to.be.true
      expect(project.saveConfig.calledOnce).to.be.true
      expect(log.info.calledOnce).to.be.true
      expect(log.info.args[0][0]).to.match(/updated project version/)
      expect(project.commitConfig.calledOnce).to.be.true
      expect(project.tagRepo.calledOnce).to.be.true
      expect(log.error.calledOnce).to.be.true
      expect(log.error.args[0][0]).to.match(/not today/)
      done()
    }, 1)
  })

  it('should update version, commit and tag', function(done) {
    project.getConfig.yieldsAsync(null, { name: 'foo', version: '1.0.0' })
    project.saveConfig.yieldsAsync(null)
    project.getRepoStatus.yieldsAsync(null, [])
    project.commitConfig.yieldsAsync(null)
    project.tagRepo.yieldsAsync(null)

    version({ version: '2.0.0' })

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getRepoStatus.calledOnce).to.be.true
      expect(semver.valid.calledOnce).to.be.true
      expect(project.saveConfig.calledOnce).to.be.true
      expect(log.info.calledOnce).to.be.true
      expect(log.info.args[0][0]).to.match(/updated project version/)
      expect(project.commitConfig.calledOnce).to.be.true
      expect(project.tagRepo.calledOnce).to.be.true
      done()
    }, 1)
  })
})
