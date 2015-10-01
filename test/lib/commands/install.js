/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var sandbox = sinon.sandbox.create()
var pkgLib = {
  isInstalled: sandbox.stub(),
  install: sandbox.stub()
}
var project = {
  getConfig: sandbox.stub().yieldsAsync(null, { name: 'foo' }),
  saveDependency: sandbox.stub()
}
var api = {
  resolve: sandbox.stub(),
  get: sandbox.stub()
}
var log = {
  error: sandbox.stub(),
  info: sandbox.stub()
}

var install

describe('commands/install', function() {
  before(function() {
    mockery.enable({ useCleanCache: true })
  })

  beforeEach(function() {
    mockery.registerMock('winston', log)
    mockery.registerMock('../project.js', project)
    mockery.registerMock('../package.js', pkgLib)
    mockery.registerMock('../api.js', api)
    mockery.registerAllowables(['async', 'lodash'])

    mockery.registerAllowable('../../../lib/commands/install.js', true)
    install = require('../../../lib/commands/install.js').command
  })

  afterEach(function() {
    sandbox.reset()
    mockery.deregisterAll()
  })

  after(function() {
    mockery.disable()
  })

  it('should exist', function() {
    expect(install).to.not.be.undefined
    expect(install.usage).to.not.be.undefined
    expect(Object.keys(install).length).to.be.ok
  })

  it('should handle error if no package-name or config', function(done) {
    project.getConfig.yieldsAsync(new Error('no config'))

    install({})

    process.nextTick(function() {
      expect(project.getConfig.calledOnce).to.be.true
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.equal('nothing to install')
      sinon.assert.calledOnce(log.info)
      expect(log.info.args[0][0]).to.match(/mlpm install/)
      done()
    })
  })

  it('should reject self-dependency', function(done) {
    project.getConfig.yieldsAsync(null, { name: 'foo' })

    install({ package: 'foo' })

    process.nextTick(function() {
      expect(project.getConfig.calledOnce).to.be.true
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/can't depend on yourself/)
      done()
    })
  })

  it('should handle api.resolve error', function(done) {
    project.getConfig.yieldsAsync(null, { name: 'foo' })
    api.resolve.yieldsAsync(new Error('no server'))

    install({ package: 'bar' })

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(api.resolve.calledOnce).to.be.true
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/no server/)
      done()
    }, 1)
  })

  it('should handle duplicate dependencies', function(done) {
    project.getConfig.yieldsAsync(null, { name: 'foo' })
    api.resolve.yieldsAsync(null, {
      "path":".\/mlpm_modules",
      "package":"group-by",
      "dependencies":[{
        "path":".\/mlpm_modules\/group-by\/mlpm_modules",
        "package":"cts-extensions",
        "version":"1.1.1"
      },{
        "path":".\/mlpm_modules\/group-by\/mlpm_modules",
        "package":"cts-extensions",
        "version":"1.2.1"
      }],
      "version":"1.1.0"
    })

    install({ package: 'group-by' })

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(api.resolve.calledOnce).to.be.true
      sinon.assert.callCount(log.info, 4)
      expect(log.info.args[0][0]).to.equal('version conflict for cts-extensions')
      expect(log.info.args[1][0]).to.match(/1\.1\.1/)
      expect(log.info.args[2][0]).to.match(/1\.2\.1/)
      expect(log.info.args[3][0]).to.equal('installing 1.2.1\n')
      done()
    }, 1)
  })

  it('should skip installed packages', function(done) {
    project.getConfig.yieldsAsync(null, { name: 'foo' })
    api.resolve.yieldsAsync(null, {
      "path":".\/mlpm_modules",
      "package":"group-by",
      "dependencies":[{
        "path":".\/mlpm_modules\/group-by\/mlpm_modules",
        "package":"cts-extensions",
        "version":"1.1.1"
      },{
        "path":".\/mlpm_modules\/group-by\/mlpm_modules",
        "package":"bar",
        "version":"2.0.0"
      }],
      "version":"1.1.0"
    })
    pkgLib.isInstalled.withArgs('cts-extensions').yieldsAsync(null, true, {
      name: 'cts-extensions',
      version: '1.1.2'
    })
    pkgLib.isInstalled.withArgs('group-by').yieldsAsync(null, true, {
      name: 'group-by',
      version: '1.1.0'
    })
    pkgLib.isInstalled.withArgs('bar').yieldsAsync(null, true, {
      name: 'bar',
      version: '1.0.0'
    })

    install({ package: 'group-by' })

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(api.resolve.calledOnce).to.be.true
      sinon.assert.calledThrice(pkgLib.isInstalled)
      pkgLib.isInstalled.resetBehavior()

      sinon.assert.calledTwice(api.get)
      sinon.assert.calledOnce(log.info)
      expect(log.info.args[0][0]).to.equal('downgrading cts-extensions from 1.1.2 to 1.1.1')

      done()
    }, 1)
  })

  it('should handle error getting package archive', function(done) {
    project.getConfig.yieldsAsync(null, { name: 'foo' })
    api.resolve.yieldsAsync(null, {
      "path":".\/mlpm_modules",
      "package":"group-by",
      "dependencies":[{
        "path":".\/mlpm_modules\/group-by\/mlpm_modules",
        "package":"cts-extensions",
        "version":"1.1.1"
      }],
      "version":"1.1.0"
    })
    pkgLib.isInstalled.yieldsAsync(null, false)
    api.get.yieldsAsync(new Error('something broke'))

    install({ package: 'group-by' })

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(api.resolve.calledOnce).to.be.true
      sinon.assert.calledTwice(pkgLib.isInstalled)
      sinon.assert.calledTwice(api.get)
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/something broke/)
      done()
    }, 1)
  })

  it('should install package and dependencies', function(done) {
    project.getConfig.yieldsAsync(null, { name: 'foo' })
    api.resolve.yieldsAsync(null, {
      "path":".\/mlpm_modules",
      "package":"group-by",
      "dependencies":[{
        "path":".\/mlpm_modules\/group-by\/mlpm_modules",
        "package":"cts-extensions",
        "version":"1.1.1"
      }],
      "version":"1.1.0"
    })
    pkgLib.isInstalled.yieldsAsync(null, false)
    api.get.yieldsAsync(null, {})
    pkgLib.install.yieldsAsync(null)

    install({ package: 'group-by' })

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(api.resolve.calledOnce).to.be.true

      sinon.assert.calledTwice(pkgLib.isInstalled)
      expect(pkgLib.isInstalled.args[0][0]).to.equal('group-by')
      expect(pkgLib.isInstalled.args[1][0]).to.equal('cts-extensions')

      sinon.assert.calledTwice(api.get)
      sinon.assert.calledTwice(pkgLib.install)

      sinon.assert.calledOnce(log.info)
      expect(log.info.args[0][0]).to.equal('installed group-by@1.1.0')
      done()
    }, 1)
  })

  it('should handler error saving package as dependency', function(done) {
    project.getConfig.yieldsAsync(null, { name: 'foo' })
    api.resolve.yieldsAsync(null, {
      "path":".\/mlpm_modules",
      "package":"cts-extensions",
      "version":"1.1.1"
    })
    pkgLib.isInstalled.yieldsAsync(null, false)
    api.get.yieldsAsync(null, {})
    pkgLib.install.yieldsAsync(null)
    project.saveDependency.yieldsAsync(new Error('nope'))

    install({ package: 'cts-extensions', save: true })

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(api.resolve.calledOnce).to.be.true
      sinon.assert.calledOnce(pkgLib.isInstalled)
      sinon.assert.calledOnce(api.get)
      sinon.assert.calledOnce(pkgLib.install)
      sinon.assert.calledOnce(log.info)
      expect(log.info.args[0][0]).to.equal('installed cts-extensions@1.1.1')
      sinon.assert.calledOnce(log.error)
      expect(log.error.args[0][0]).to.match(/nope/)
      done()
    }, 1)
  })

  it('should install and save package as dependency', function(done) {
    project.getConfig.yieldsAsync(null, { name: 'foo' })
    api.resolve.yieldsAsync(null, {
      "path":".\/mlpm_modules",
      "package":"cts-extensions",
      "version":"1.1.1"
    })
    pkgLib.isInstalled.yieldsAsync(null, false)
    api.get.yieldsAsync(null, {})
    pkgLib.install.yieldsAsync(null)
    project.saveDependency.yieldsAsync(null)

    install({ package: 'cts-extensions', save: true })

    setTimeout(function() {
      expect(project.getConfig.calledOnce).to.be.true
      expect(api.resolve.calledOnce).to.be.true
      sinon.assert.calledOnce(pkgLib.isInstalled)
      sinon.assert.calledOnce(api.get)
      sinon.assert.calledOnce(pkgLib.install)
      sinon.assert.calledTwice(log.info)
      expect(log.info.args[0][0]).to.equal('installed cts-extensions@1.1.1')
      expect(log.info.args[1][0]).to.equal('saved cts-extensions to mlpm.json')
      done()
    }, 1)
  })

  it('should handle errors installing project dependencies', function(done) {
    project.getConfig.yieldsAsync(null, {
      name: 'foo',
      dependencies: {
        bar: 'latest',
        baz: '*'
      }
    })
    api.resolve.yieldsAsync(new Error('nope'))

    install({})

    setTimeout(function() {
      sinon.assert.calledOnce(project.getConfig)
      sinon.assert.calledTwice(api.resolve)
      sinon.assert.calledTwice(log.error)
      expect(log.error.args[0][0]).to.match(/nope/)
      expect(log.error.args[1][0]).to.match(/nope/)
      done()
    }, 1)
  })

  it('should install project dependencies', function(done) {
    project.getConfig.yieldsAsync(null, {
      name: 'foo',
      dependencies: {
        bar: 'latest',
        baz: '*'
      }
    })
    api.resolve.withArgs('bar').yieldsAsync(null, {
      "path":".\/mlpm_modules",
      "package":"bar",
      "dependencies":[],
      "version":"1.1.0"
    })
    api.resolve.withArgs('baz').yieldsAsync(null, {
      "path":".\/mlpm_modules",
      "package":"baz",
      "dependencies":[],
      "version":"1.1.0"
    })
    pkgLib.isInstalled.withArgs('bar').yieldsAsync(null, true, {
      name: 'bar',
      version: '1.0.0'
    })
    pkgLib.isInstalled.withArgs('baz').yieldsAsync(null, true, {
      name: 'baz',
      version: '1.0.0'
    })
    api.get.yieldsAsync(null, {})
    pkgLib.install.yieldsAsync(null)

    install({})

    setTimeout(function() {
      sinon.assert.calledOnce(project.getConfig)
      sinon.assert.calledTwice(api.resolve)
      sinon.assert.calledTwice(pkgLib.isInstalled)
      sinon.assert.calledTwice(api.get)
      sinon.assert.calledTwice(pkgLib.install)
      sinon.assert.calledTwice(log.info)
      expect(log.info.args[0][0]).to.equal('installed bar@1.1.0')
      expect(log.info.args[1][0]).to.equal('installed baz@1.1.0')
      done()
    }, 1)
  })
})
