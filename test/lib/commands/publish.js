/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var sandbox = sinon.sandbox.create()
var fs = { writeFile: sandbox.stub().yieldsAsync(null) }
var api = { publish: sandbox.stub().yieldsAsync(null, null) }
var util = {
  getAuth: sandbox.stub().yieldsAsync(null, { token: 'token' })
}

var zipGen = sandbox.stub()
var project = {
  createZip: sandbox.stub().yieldsAsync(null, { generate: zipGen }),
  getConfig: sandbox.stub().yieldsAsync(null, { name: 'foo', version: '1' }),
  getFiles: sandbox.stub().yieldsAsync(null, [{ path: 'mlpm.json' }])
}
var hash = {
  sha256: sandbox.stub().returnsThis(),
  update: sandbox.stub().returnsThis(),
  digest: sandbox.stub()
}
var log = {
  error: sandbox.stub(),
  info: sandbox.stub()
}

var publish

describe('commands/publish', function() {
  before(function() {
    mockery.enable({ useCleanCache: true })
  })

  beforeEach(function() {
    mockery.registerMock('winston', log)
    mockery.registerMock('fs', fs)
    mockery.registerMock('hash.js', hash)
    mockery.registerMock('../project.js', project)
    mockery.registerMock('../api.js', api)
    mockery.registerMock('../util.js', util)
    mockery.registerAllowable('lodash')

    mockery.registerAllowable('../../../lib/commands/publish.js', true)
    publish = require('../../../lib/commands/publish.js').command
  })

  afterEach(function() {
    sandbox.reset()
    mockery.deregisterAll()
  })

  after(function() {
    mockery.disable()
  })

  it('should exist', function() {
    expect(publish).to.not.be.undefined
    expect(publish.usage).to.not.be.undefined
    expect(Object.keys(publish).length).to.be.ok
  })

  it('should handle getAuth error', function(done) {
    util.getAuth.yieldsAsync(new Error('no auth'))
    publish({})

    setTimeout(function() {
      expect(util.getAuth.calledOnce).to.be.true
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/no auth/)
      done()
    }, 1)
  })

  it('should handle getConfig error', function(done) {
    util.getAuth.yieldsAsync(null, { token: 'token' })
    project.getConfig.yieldsAsync(new Error('no config'))

    publish({})

    setTimeout(function() {
      expect(util.getAuth.calledOnce).to.be.true
      expect(project.getConfig.calledOnce).to.be.true
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/no config/)
      done()
    }, 1)
  })

  it('should not publish private package', function(done) {
    util.getAuth.yieldsAsync(null, { token: 'token' })
    project.getConfig.yieldsAsync(null, { name: 'foo', version: '1', private: true })

    publish({})

    setTimeout(function() {
      expect(util.getAuth.calledOnce).to.be.true
      expect(project.getConfig.calledOnce).to.be.true
      sinon.assert.calledOnce(log.info)
      expect(log.info.args[0][0]).to.equal('private; can\'t publish')
      done()
    }, 1)
  })

  it('should handle createZip error', function(done) {
    util.getAuth.yieldsAsync(null, { token: 'token' })
    project.getConfig.yieldsAsync(null, { name: 'foo', version: '1' })
    project.createZip.yieldsAsync(new Error('bad zip'))

    publish({})

    setTimeout(function() {
      expect(util.getAuth.calledOnce).to.be.true
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.createZip.calledOnce).to.be.true
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/bad zip/)
      done()
    }, 1)
  })

  it('should handle api.publish error', function(done) {
    util.getAuth.yieldsAsync(null, { token: 'token' })
    project.getConfig.yieldsAsync(null, { name: 'foo', version: '1' })
    project.createZip.yieldsAsync(null, { generate: zipGen })
    api.publish.yieldsAsync(new Error('bad request'))

    publish({})

    setTimeout(function() {
      expect(util.getAuth.calledOnce).to.be.true
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.createZip.calledOnce).to.be.true
      expect(zipGen.calledOnce).to.be.true
      expect(api.publish.calledOnce).to.be.true
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/bad request/)
      done()
    }, 1)
  })

  it('should publish project', function(done) {
    util.getAuth.yieldsAsync(null, { token: 'token' })
    project.getConfig.yieldsAsync(null, { name: 'foo', version: '1' })
    project.createZip.yieldsAsync(null, { generate: zipGen })
    api.publish.yieldsAsync(null)

    publish({})

    setTimeout(function() {
      expect(util.getAuth.calledOnce).to.be.true
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.createZip.calledOnce).to.be.true
      expect(zipGen.calledOnce).to.be.true
      expect(api.publish.calledOnce).to.be.true
      sinon.assert.calledOnce(log.info)
      expect(log.info.args[0][0]).to.equal('published foo@1')
      done()
    }, 1)
  })

  it('should handle error saving local export', function(done) {
    fs.writeFile.yieldsAsync(new Error('no disk'))
    publish({ export: true })

    setTimeout(function() {
      expect(util.getAuth.calledOnce).to.be.true
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.createZip.calledOnce).to.be.true
      expect(zipGen.calledOnce).to.be.true
      expect(fs.writeFile.calledOnce).to.be.true
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/no disk/)
      done()
    }, 1)
  })

  it('should do a local export', function(done) {
    fs.writeFile.yieldsAsync(null)

    publish({ export: true })

    setTimeout(function() {
      expect(util.getAuth.calledOnce).to.be.true
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.createZip.calledOnce).to.be.true
      expect(zipGen.calledOnce).to.be.true
      expect(fs.writeFile.calledOnce).to.be.true
      done()
    }, 1)
  })

  it('should handle getConfig err in a dry-run', function(done) {
    project.getConfig.yieldsAsync(new Error('no config'))
    publish({ dryrun: true })

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/no config/)
      done()
    }, 1)
  })

  it('should handle getFiles err in a dry-run', function(done) {
    project.getConfig.yieldsAsync(null, { name: 'foo', version: '1' })
    project.getFiles.yieldsAsync(new Error('no files'))
    publish({ dryrun: true })

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getFiles.calledOnce).to.be.true
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/no files/)
      done()
    }, 1)
  })

  it('should do a publish dry-run', function(done) {
    project.getFiles.yieldsAsync(null, [{ path: 'mlpm.json' }])
    publish({ dryrun: true })

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getFiles.calledOnce).to.be.true
      sinon.assert.calledTwice(log.info)
      expect(log.info.args[0][0]).to.equal('foo@1')
      expect(log.info.args[1][0]).to.equal('mlpm.json')
      done()
    }, 1)
  })
})
