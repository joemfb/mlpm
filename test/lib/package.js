/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var vinylFs = require('vinyl-fs')
var JSZip = require('jszip')

var sandbox = sinon.sandbox.create()

var fs = { writeFile: sandbox.stub() }
var util = {
  readJson: sandbox.stub(),
  readByLine: sandbox.stub()
}
var vfs = { src: sandbox.stub() }
var mkdirp = sandbox.stub()
var rimraf = sandbox.stub()

var pkg

describe('lib/package', function() {
  before(function() {
    mockery.enable()
  })

  beforeEach(function() {
    mockery.registerMock('vinyl-fs', vfs)
    mockery.registerMock('fs', fs)
    mockery.registerMock('mkdirp', mkdirp)
    mockery.registerMock('rimraf', rimraf)
    mockery.registerMock('./util.js', util)

    mockery.warnOnUnregistered(false)
    // mockery.registerAllowables([
    //   'lodash',
    //   'jszip',
    //   'concat-stream',
    //   'async',
    //   'lodash',
    //   'path',
    //   'slash'
    // ])

    mockery.registerAllowable('../../lib/package.js', true)

    pkg = require('../../lib/package.js')
  })

  afterEach(function() {
    sandbox.reset()
    mockery.deregisterAll()
  })

  after(function() {
    mockery.disable()
  })

  it('should exist', function() {
    expect(pkg).to.not.be.undefined
    expect(Object.keys(pkg).length).to.be.ok
  })

  it('should get xqy metadata from multiple lines', function() {
    var cb = sinon.stub()
    var resume = sinon.stub()
    var close = sinon.stub()

    util.readByLine.yields('xquery version "1.0-ml";', resume, close)
    pkg.xqyMetadata('foo/bar.xqy', cb)

    expect(resume.calledOnce).to.be.true
    expect(close.calledOnce).to.be.false
    expect(cb.calledOnce).to.be.false
  })

  it('should get xqy main module metadata', function() {
    var cb = sinon.stub()
    var resume = sinon.stub()
    var close = sinon.stub()

    util.readByLine.yields('declare namespace foo = "bar";', resume, close)
    pkg.xqyMetadata('foo/bar.xqy', cb)

    expect(resume.called).to.be.false
    expect(close.calledOnce).to.be.true
    expect(cb.calledOnce).to.be.true
    var args = cb.args[0]
    expect(args[0]).to.be.null
    expect(args[1]).to.be.null
  })

  it('should get xqy library module metadata', function() {
    var cb = sinon.stub()
    var resume = sinon.stub()
    var close = sinon.stub()

    util.readByLine.yields('module namespace foo = "bar";', resume, close)
    pkg.xqyMetadata('foo/bar.xqy', cb)

    expect(resume.called).to.be.false
    expect(close.calledOnce).to.be.true
    expect(cb.calledOnce).to.be.true
    var args = cb.args[0]
    expect(args[0]).to.be.null
    expect(args[1].type).to.equal('module')
    expect(args[1].ns).to.equal('bar')
  })

  it('should handle whitespace in xqy library module', function() {
    var cb = sinon.stub()
    var resume = sinon.stub()
    var close = sinon.stub()

    util.readByLine.yields(' module  namespace  foo= "bar" ;', resume, close)
    pkg.xqyMetadata('foo/bar.xqy', cb)

    expect(resume.called).to.be.false
    expect(close.calledOnce).to.be.true
    expect(cb.calledOnce).to.be.true
    var args = cb.args[0]
    expect(args[0]).to.be.null
    expect(args[1].type).to.equal('module')
    expect(args[1].ns).to.equal('bar')
  })

  it('should continue with unparseable xqy library module namespace', function() {
    var cb = sinon.stub()
    var resume = sinon.stub()
    var close = sinon.stub()

    util.readByLine.yields('modulenamespace foo= "bar"', resume, close)
    pkg.xqyMetadata('foo/bar.xqy', cb)

    expect(resume.called).to.be.false
    expect(close.calledOnce).to.be.true
    expect(cb.calledOnce).to.be.true
    var args = cb.args[0]
    expect(args[0]).to.be.null
    expect(args[1].type).to.equal('module')
    expect(args[1].ns).to.be.null
  })

  it('should get xqy rest resource metadata', function() {
    var cb = sinon.stub()
    var resume = sinon.stub()
    var close = sinon.stub()

    util.readByLine.yields('module namespace foo = "http://marklogic.com/rest-api/resource/bar";', resume, close)
    pkg.xqyMetadata('foo/bar.xqy', cb)

    expect(resume.called).to.be.false
    expect(close.calledOnce).to.be.true
    expect(cb.calledOnce).to.be.true
    var args = cb.args[0]
    expect(args[0]).to.be.null
    expect(args[1].type).to.equal('resource')
    expect(args[1].ns).to.equal('http://marklogic.com/rest-api/resource/bar')
    expect(args[1].name).to.equal('bar')
  })

  it('should get xqy rest transform metadata', function() {
    var cb = sinon.stub()
    var resume = sinon.stub()
    var close = sinon.stub()

    util.readByLine.yields('module namespace foo = "http://marklogic.com/rest-api/transform/bar";', resume, close)
    pkg.xqyMetadata('foo/bar.xqy', cb)

    expect(resume.called).to.be.false
    expect(close.calledOnce).to.be.true
    expect(cb.calledOnce).to.be.true
    var args = cb.args[0]
    expect(args[0]).to.be.null
    expect(args[1].type).to.equal('transform')
    expect(args[1].ns).to.equal('http://marklogic.com/rest-api/transform/bar')
    expect(args[1].name).to.equal('bar')
  })

  it('should get file format from path', function() {
    var format

    format = pkg.formatFromPath('blah/blue/foo.xqy')
    expect(format).to.equal('xqy')

    format = pkg.formatFromPath('blah/blue/foo.xq')
    expect(format).to.equal('xqy')

    format = pkg.formatFromPath('blah/blue/foo.xql')
    expect(format).to.equal('xqy')

    format = pkg.formatFromPath('blah/blue/foo.xqm')
    expect(format).to.equal('xqy')

    format = pkg.formatFromPath('blah/blue/foo.sjs')
    expect(format).to.equal('sjs')

    format = pkg.formatFromPath('blah/blue/foo')
    expect(format).to.equal('txt')
  })

  it('should handle path error in get file metadata', function() {
    var filePath = process.cwd() + '/blue/green/purple.xqy'
    var stub = sinon.stub()

    pkg.getFileMetadata(filePath, null, stub)

    expect(stub.calledOnce).to.be.true
    expect(stub.args[0]).to.match(/Path parsing error/)
  })

  it('should get xqy file metadata', function(done) {
    var filePath = process.cwd() + '/mlpm_modules/green/purple.xqy'
    var stub = sinon.stub()
    var resume = sinon.stub()
    var close = sinon.stub()

    util.readByLine.yields('module namespace foo = "bar";', resume, close)

    pkg.getFileMetadata(filePath, null, stub)

    expect(util.readByLine.calledOnce).to.be.true

    process.nextTick(function() {
      expect(stub.calledOnce).to.be.true
      var args = stub.args[0][1]
      expect(args.type).to.equal('module')
      expect(args.format).to.equal('xqy')
      expect(args.path).to.equal(filePath)
      expect(args.relativePath).to.equal('mlpm_modules/green/purple.xqy')
      expect(args.location).to.equal('/ext/mlpm_modules/green/purple.xqy')
      done()
    })
  })

  it('should get other file metadata', function(done) {
    var filePath = process.cwd() + '/mlpm_modules/green/purple.sjs'
    var stub = sinon.stub()

    pkg.getFileMetadata(filePath, null, stub)

    process.nextTick(function() {
      expect(stub.calledOnce).to.be.true
      var args = stub.args[0][1]
      expect(args.type).to.equal('asset')
      expect(args.format).to.equal('sjs')
      expect(args.path).to.equal(filePath)
      expect(args.relativePath).to.equal('mlpm_modules/green/purple.sjs')
      expect(args.location).to.equal('/ext/mlpm_modules/green/purple.sjs')
      done()
    })
  })

  it('should get files', function(done) {
    // TODO: mock vfs
    vfs.src.returns( vinylFs.src('./test/fixtures/files/*', { read: false }) )

    pkg.getFiles('blah', function(err, files) {
      expect(vfs.src.calledOnce).to.be.true
      expect(files[0]).to.match(/test.sjs$/)
      expect(files[1]).to.match(/test.xqy$/)
      done()
    })
  })

  it('should parse deploy config', function() {
    var basePath = process.cwd() + '/mlpm_modules/foo/'

    var parsed = pkg.parseDeployConfig({
      name: 'foo',
      deploy: {
        'resource.sjs': 'resource',
        'transform.sjs': 'transform'
      }
    })

    expect(parsed).not.to.be.undefined
    expect(parsed[ basePath + 'resource.sjs' ]).not.to.be.undefined
    expect(parsed[ basePath + 'resource.sjs' ].type).to.equal('resource')
    expect(parsed[ basePath + 'transform.sjs' ]).not.to.be.undefined
    expect(parsed[ basePath + 'transform.sjs' ].type).to.equal('transform')

    parsed = pkg.parseDeployConfig({
      name: 'foo',
      deploy: {
        'resource.sjs': {
          type: 'resource',
          format: 'sjs'
        },
        'transform.sjs': {
         type: 'transform',
          format: 'sjs'
        }
      }
    })

    expect(parsed).not.to.be.undefined
    expect(parsed[ basePath + 'resource.sjs' ]).not.to.be.undefined
    expect(parsed[ basePath + 'resource.sjs' ].type).to.equal('resource')
    expect(parsed[ basePath + 'resource.sjs' ].format).to.equal('sjs')
    expect(parsed[ basePath + 'transform.sjs' ]).not.to.be.undefined
    expect(parsed[ basePath + 'transform.sjs' ].type).to.equal('transform')
    expect(parsed[ basePath + 'transform.sjs' ].format).to.equal('sjs')

    parsed = pkg.parseDeployConfig({
      name: 'foo',
      deploy: [
        {
          file: 'resource.sjs',
          type: 'resource',
          format: 'sjs'
        },
        {
         file: 'transform.sjs',
         type: 'transform',
          format: 'sjs'
        }
      ]
    })

    expect(parsed).not.to.be.undefined
    expect(parsed[ basePath + 'resource.sjs' ]).not.to.be.undefined
    expect(parsed[ basePath + 'resource.sjs' ].type).to.equal('resource')
    expect(parsed[ basePath + 'resource.sjs' ].format).to.equal('sjs')
    expect(parsed[ basePath + 'transform.sjs' ]).not.to.be.undefined
    expect(parsed[ basePath + 'transform.sjs' ].type).to.equal('transform')
    expect(parsed[ basePath + 'transform.sjs' ].format).to.equal('sjs')

    function errorFn() {
      return pkg.parseDeployConfig({
        name: 'foo',
        deploy: [
          'resource.sjs',
          'transform.sjs'
        ]
      })
    }

    expect(errorFn).to.throw(Error)
    expect(errorFn).to.throw(/invalid deploy config/)
  })

  it('should parse contents', function(done) {
    // TODO: mock vfs
    // need to be able to set the paths
    vfs.src.returns( vinylFs.src('./test/fixtures/files/*', { read: false }) )

    pkg.parseContents({ name: 'foo' }, function(err) {
      expect(err).to.be.match(/Path parsing error/)
      done()
    })
  })

  it('should handle error when parsing contents', function(done) {
    var stub = sinon.stub()

    pkg.parseContents({
      name: 'foo',
      deploy: [
        'resource.sjs',
        'transform.sjs'
      ]
    }, stub)

    process.nextTick(function() {
      expect(stub.calledOnce).to.be.true
      expect(stub.args[0][0]).to.match(/invalid deploy config/)
      done()
    })
  })

  it('should get package config', function(done) {
    util.readJson.yieldsAsync(null, { name: 'foo' })

    pkg.getConfig('foo', function(err, pkgConfig) {
      expect(util.readJson.calledOnce).to.be.true
      var args = util.readJson.args[0]
      expect(util.readJson.args[0][0]).to.equal('./mlpm_modules/foo/mlpm.json')
      done()
    })
  })

  it('should install', function(done) {
    var zip = new JSZip()
    zip.file( 'mlpm.json', '{ "name": "foo" }' )
    zip.file( 'test.sjs', 'xdmp.log("hi")' )

    var buffer = zip.generate({type: 'nodebuffer'})

    mkdirp.yields(null)
    rimraf.yields(null)
    fs.writeFile.yields(null)

    pkg.install(buffer, 'foo', function(err) {
      expect(rimraf.calledOnce).to.be.true
      expect(rimraf.args[0][0]).to.match(/mlpm_modules\/foo$/)

      expect(mkdirp.calledTwice).to.be.true
      expect(mkdirp.args[0][0]).to.match(/mlpm_modules\/foo$/)

      expect(fs.writeFile.calledTwice).to.be.true
      expect(fs.writeFile.args[0][0]).to.match(/mlpm_modules\/foo\/mlpm.json$/)
      expect(fs.writeFile.args[1][0]).to.match(/mlpm_modules\/foo\/test.sjs$/)
      done()
    })
  })

  it('should invoke install callback with error', function(done) {
    var zip = new JSZip()
    zip.file( 'mlpm.json', '{ "name": "foo" }' )
    zip.file( 'test.sjs', 'xdmp.log("hi")' )

    var buffer = zip.generate({type: 'nodebuffer'})

    mkdirp.yields(new Error('no can do'))
    rimraf.yields(null)
    fs.writeFile.yields(null)

    pkg.install(buffer, 'foo', function(err) {
      expect(err).to.match(/no can do/)

      expect(rimraf.calledTwice).to.be.true
      expect(rimraf.args[0][0]).to.match(/mlpm_modules\/foo$/)
      expect(rimraf.args[1][0]).to.match(/mlpm_modules\/foo$/)

      expect(mkdirp.calledOnce).to.be.true
      expect(mkdirp.args[0][0]).to.match(/mlpm_modules\/foo$/)

      expect(fs.writeFile.called).to.be.false
      done()
    })
  })
})
