/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var sandbox = sinon.sandbox.create()
var yargs = {
  argv: {
    _: [],
    '$0': 'mlpm'
  },
  alias: sandbox.stub().returnsThis(),
  boolean: sandbox.stub().returnsThis(),
  usage: sandbox.stub().returnsThis()
}
var argsLib

describe('lib/args', function() {
  before(function() {
    mockery.enable()
  })

  beforeEach(function() {
    mockery.registerMock('yargs', yargs)
    mockery.registerAllowable('lodash')

    mockery.registerAllowable('../../lib/args.js', true)
    argsLib = require('../../lib/args.js')
  })

  afterEach(function() {
    sandbox.reset()
    mockery.deregisterAll()
  })

  after(function() {
    mockery.disable()
  })

  it('should exist', function() {
    expect(argsLib).to.not.be.undefined
    expect(Object.keys(argsLib).length).to.be.ok
  })

  it('should parse args', function() {
    var args = argsLib.parse()
    expect(args.command).to.be.undefined
    expect(args.unknown).to.be.undefined
  })

  it('should parse args with command', function() {
    yargs.argv._ = ['ls']

    var args = argsLib.parse()
    expect(args.command).to.equal('ls')
    expect(args.unknown).to.be.undefined
  })

  it('should parse args with search query', function() {
    yargs.argv._ = ['search', 'for', 'this']

    var args = argsLib.parse()
    expect(args.command).to.equal('search')
    expect(args.query).to.equal('for this')
  })

  it('should parse args with login token', function() {
    yargs.argv._ = ['login', 'token']

    var args = argsLib.parse()
    expect(args.command).to.equal('login')
    expect(args.token).to.equal('token')
  })

  it('should parse args with version command', function() {
    yargs.argv._ = ['version', 'patch']

    var args = argsLib.parse()
    expect(args.command).to.equal('version')
    expect(args.version).to.equal('patch')
  })

  it('should parse args with package', function() {
    yargs.argv._ = ['info', 'package-name']

    var args = argsLib.parse()
    expect(args.command).to.equal('info')
    expect(args.package).to.equal('package-name')
  })

  it('should parse args with package/version', function() {
    yargs.argv._ = ['info', 'package-name@1.3.2']

    var args = argsLib.parse()
    expect(args.command).to.equal('info')
    expect(args.package).to.equal('package-name')
    expect(args.version).to.equal('1.3.2')
  })
})
