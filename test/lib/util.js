/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var sinon = require('sinon')
var mockery = require('mockery')

var Readable = require('stream').Readable

var sandbox = sinon.sandbox.create()
var fs = {
  readFile: sandbox.stub(),
  writeFile: sandbox.stub(),
  createReadStream: sandbox.stub()
}
var prompt = {
  start: sandbox.stub(),
  get: sandbox.stub()
}
// var proc = { env: {} }
var util

describe('lib/util', function() {
  before(function() {
    mockery.enable()
  })

  beforeEach(function() {
    mockery.registerMock('fs', fs)
    // mockery.registerMock('process', proc)
    mockery.registerMock('prompt', prompt)
    mockery.registerAllowable('byline')

    mockery.registerAllowable('../../lib/util.js', true)
    util = require('../../lib/util.js')
  })

  afterEach(function() {
    sandbox.reset()
    mockery.deregisterAll()
  })

  after(function() {
    mockery.disable()
  })

  it('should exist', function() {
    expect(util).to.not.be.undefined
    expect(Object.keys(util).length).to.be.ok
  })

  it('should get auth', function(done) {
    fs.readFile.yieldsAsync(null, '{ "token": "token" }')

    util.getAuth(function(err, token) {
      expect(fs.readFile.calledOnce).to.be.true
      expect(token).to.equal('token')
      done()
    })
  })

  it('should get admin auth', function(done) {
    prompt.get.yieldsAsync(null, { user: 'u', pass: 'p' })

    util.getAuth(true, function(err, auth) {
      expect(prompt.start.calledOnce).to.be.true
      expect(prompt.get.calledOnce).to.be.true

      expect(auth).not.to.be.undefined
      expect(auth.user).to.equal('u')
      expect(auth.pass).to.equal('p')
      done()
    })
  })

  it('should getAuth callback on error', function(done) {
    fs.readFile.yieldsAsync(new Error('bad'))

    util.getAuth(function(err, token) {
      expect(err).to.match(/bad/)
      done()
    })
  })

  it('should getAuth callback with error when missing token', function(done) {
    fs.readFile.yieldsAsync(null, '{}')

    util.getAuth(function(err, token) {
      expect(err).to.match(/token/)
      done()
    })
  })

  it('should call readJson callback on error', function(done) {
    fs.readFile.yieldsAsync(new Error('bad'))

    util.readJson('blah', function(err, data) {
      expect(fs.readFile.calledOnce).to.be.true
      expect(err).to.match(/bad/)
      done()
    })
  })

  it('should call readJson callback on invalid JSON error', function(done) {
    fs.readFile.yieldsAsync(null, '{ k }')

    util.readJson('blah', function(err, data) {
      expect(fs.readFile.calledOnce).to.be.true
      expect(err).to.match(/Unexpected token k/)
      done()
    })
  })

  it('should get user config', function(done) {
    process.env.HOME = '/home/blah'
    fs.readFile.yieldsAsync(null, '{}')

    util.getConfig(function(err, config) {
      expect(fs.readFile.calledOnce).to.be.true

      var args = fs.readFile.args[0]
      expect(args[0]).to.equal('/home/blah/.mlpmrc')
      expect(args[1]).to.equal('utf8')
      done()
    })
  })

  it('should get user config from other home directories - 1', function(done) {
    delete process.env.HOME
    process.env.HOMEPATH = '/home/foo'

    util.getConfig(function(err, config) {
      expect(fs.readFile.args[0][0]).to.equal('/home/foo/.mlpmrc')
      done()
    })
  })

  it('should get user config from other home directories - 2', function(done) {
    delete process.env.HOMEPATH
    process.env.USERPROFILE = '/home/bar'

    util.getConfig(function(err, config) {
      expect(fs.readFile.args[0][0]).to.equal('/home/bar/.mlpmrc')
      done()
    })
  })

  it('should save user config', function(done) {
    fs.writeFile.yieldsAsync(null)

    process.env.HOME = '/dir'

    util.saveConfig({}, function(err) {
      expect(fs.writeFile.calledOnce).to.be.true
      expect(fs.writeFile.args[0][0]).to.equal('/dir/.mlpmrc')
      done()
    })
  })

  it('should read file by line', function(done) {
    var end = sinon.stub()

    var rs = new Readable()
    rs.push('foo\nbar')
    rs.push(null)

    fs.createReadStream.returns(rs)

    var counter = 0

    util.readByLine('path/to/file.txt', function(line, resume, close) {
      if (counter === 0) {
        expect(fs.createReadStream.calledOnce).to.be.true
        expect(line).to.equal('foo')
        counter++
        resume()
      } else {
        expect(fs.createReadStream.calledOnce).to.be.true
        expect(line).to.equal('bar')
        close()
      }
    }, end)

    setTimeout(function() {
      expect(end.called).to.be.false
      done()
    }, 0)
  })

  it('should read file by line, yielding the default callback', function(done) {
    var end = sinon.stub()

    var rs = new Readable()
    rs.push('foo\nbar')
    rs.push(null)

    fs.createReadStream.returns(rs)

    var counter = 0

    util.readByLine('path/to/file.txt', function(line, resume, close) {
      if (counter === 0) {
        expect(fs.createReadStream.calledOnce).to.be.true
        expect(line).to.equal('foo')
        counter++
        resume()
      } else {
        expect(fs.createReadStream.calledOnce).to.be.true
        expect(line).to.equal('bar')
        // resume here, instead of close
        resume()
      }
    }, end)

    setTimeout(function() {
      expect(end.calledOnce).to.be.true
      done()
    }, 0)
  })
})
