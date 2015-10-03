/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var sandbox = sinon.sandbox.create()
var fs = { writeFile: sandbox.stub().yields(null) }
var api = { publish: sandbox.stub().yields(null, null) }
var util = {
  getAuth: sandbox.stub().yields(null, { token: 'token' })
}

var zipGen = sandbox.stub()
var project = {
  createZip: sandbox.stub().yields(null, { generate: zipGen }),
  getConfig: sandbox.stub().yields(null, { name: 'foo' }),
  getFiles: sandbox.stub().yields(null, [{ path: 'mlpm.json' }])
}

var publish

describe('commands/info', function() {
  before(function() {
    mockery.enable({ useCleanCache: true })
  })

  beforeEach(function() {
    mockery.registerMock('fs', fs)
    mockery.registerMock('../project.js', project)
    mockery.registerMock('../api.js', api)
    mockery.registerMock('../util.js', util)

    mockery.warnOnUnregistered(false)
    // mockery.registerAllowables(['lodash', 'hash.js'])

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

  it('should publish project', function(done) {
    publish({})

    // TODO: mock console.log, or use a logging framework
    process.nextTick(function() {
      expect(util.getAuth.calledOnce).to.be.true
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.createZip.calledOnce).to.be.true
      expect(zipGen.calledOnce).to.be.true
      expect(api.publish.calledOnce).to.be.true
      done()
    })
  })

  it('should do a local export of a publish archive', function(done) {
    publish({ export: true })

    // TODO: mock console.log, or use a logging framework
    process.nextTick(function() {
      expect(util.getAuth.calledOnce).to.be.true
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.createZip.calledOnce).to.be.true
      expect(zipGen.calledOnce).to.be.true
      expect(fs.writeFile.calledOnce).to.be.true
      done()
    })
  })

  it('should do a publish dry-run', function(done) {
    publish({ dryrun: true })

    // TODO: mock console.log, or use a logging framework
    process.nextTick(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(project.getFiles.calledOnce).to.be.true
      done()
    })
  })
})
