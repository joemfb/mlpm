/* eslint-env mocha */

'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var _ = require('lodash')

var sandbox = sinon.sandbox.create()
var argsLib = { parse: sandbox.stub() }
var util = { getConfig: sandbox.stub() }
var log = {
  transports: {},
  remove: sandbox.stub(),
  add: sandbox.stub(),
  error: sandbox.stub(),
  info: sandbox.stub()
}

var defaultArgs = {
  argv: {},
  usage: sandbox.stub()
}

describe('mlpm cli', function() {
  before(function() {
    mockery.enable()
  })

  beforeEach(function() {
    mockery.registerMock('winston', log)
    mockery.registerMock('../lib/args.js', argsLib)
    mockery.registerMock('../util.js', util)
    mockery.registerAllowables(['../package.json', '../lib/commands/whoami'])
    mockery.registerAllowable('../bin/mlpm.js', true)
  })

  afterEach(function() {
    sandbox.reset()
    mockery.deregisterAll()
  })

  after(function() {
    mockery.disable()
  })

  it('should print usage', function() {
    argsLib.parse.returns(defaultArgs)
    require('../bin/mlpm.js')
    expect(defaultArgs.usage.calledOnce).to.be.true
  })

  it('should print "unknown"', function() {
    var args = _.assign(_.cloneDeep(defaultArgs), { unknown: 'blah' })
    argsLib.parse.returns(args)
    require('../bin/mlpm.js')

    expect(defaultArgs.usage.calledOnce).to.be.true
    expect(log.info.calledTwice).to.be.true
    expect(log.info.args[0][0]).to.equal('unknown command: blah')
  })

  it('should print version', function() {
    var args = _.assign(_.cloneDeep(defaultArgs), { argv: { version: true } })
    argsLib.parse.returns(args)
    require('../bin/mlpm.js')

    expect(log.info.calledOnce).to.be.true
    expect(log.info.args[0][0]).to.equal( require('../package.json').version )
  })

  it('should run command', function() {
    var args = _.assign(_.cloneDeep(defaultArgs), { command: 'whoami' })
    argsLib.parse.returns(args)
    require('../bin/mlpm.js')

    // TODO: mock console.log, or use a logging lib
    // expect(log).to have been called with ...
    expect(util.getConfig.calledOnce).to.be.true
  })

  it('should print command help', function() {
    var args = _.assign(_.cloneDeep(defaultArgs), { command: 'whoami', help: true })
    argsLib.parse.returns(args)
    require('../bin/mlpm.js')

    expect(log.info.calledOnce).to.be.true
    expect(log.info.args[0][0]).to.equal('mlpm whoami')
  })

  it('should set log level', function() {
    expect(log.level).to.be.undefined

    var args = _.assign(_.cloneDeep(defaultArgs), { command: 'whoami', q: true })
    argsLib.parse.returns(args)
    require('../bin/mlpm.js')

    expect(log.level).to.equal('error')
  })
})
